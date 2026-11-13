import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Play, Search, Video } from 'lucide-react';
import {
  formatTierLabel,
  hasTierAccess,
  type PlanTier,
  type RecordedVideoItem,
  type StudentProfile
} from '../types';

interface RecordedLibrarySectionProps {
  videos: RecordedVideoItem[];
  student: StudentProfile | null;
  studentToken: string | null;
  isOwner: boolean;
  ownerToken: string | null;
  onOpenAuth: (tab: 'login' | 'register' | 'owner', preselectedPlan?: PlanTier) => void;
}

function getYoutubeEmbed(url: string): string | null {
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

export function RecordedLibrarySection({
  videos,
  student,
  studentToken,
  isOwner,
  ownerToken,
  onOpenAuth
}: RecordedLibrarySectionProps) {
  const subjects = ['All', ...Array.from(new Set(videos.map((v) => v.subject)))];
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingVideo, setPlayingVideo] = useState<RecordedVideoItem | null>(videos[0] || null);

  useEffect(() => {
    if (videos.length === 0) {
      setPlayingVideo(null);
      return;
    }
    setPlayingVideo((prev) => {
      if (!prev) return videos[0];
      return videos.find((v) => v.id === prev.id) || videos[0];
    });
  }, [videos]);

  const filtered = videos.filter((v) => {
    const matchSubject = selectedSubject === 'All' || v.subject === selectedSubject;
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      v.title.toLowerCase().includes(q) ||
      v.instructor.toLowerCase().includes(q) ||
      v.subject.toLowerCase().includes(q);
    return matchSubject && matchQuery;
  });

  const isActiveStudent = student?.status === 'active';

  function resolveAuthorizedVideoUrl(video: RecordedVideoItem): string {
    if (!video.isLocalUpload && !video.videoUrl.startsWith('/api/media/')) {
      return video.videoUrl;
    }
    const sep = video.videoUrl.includes('?') ? '&' : '?';
    if (isOwner && ownerToken) {
      return `${video.videoUrl}${sep}ot=${encodeURIComponent(ownerToken)}`;
    }
    if (studentToken) {
      return `${video.videoUrl}${sep}st=${encodeURIComponent(studentToken)}`;
    }
    return video.videoUrl;
  }

  return (
    <section id="recorded-library" className="py-16 border-t border-zinc-800 bg-[#09090B] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
              02. Recorded Class Video Library
            </p>
            <h2
              className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white text-balance"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Rewatch Every Lecture in Full HD
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recorded lectures..."
                className="pl-9 pr-3.5 py-2 text-sm bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#E11D2E] w-full sm:w-64"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm">
              {subjects.map((subj) => {
                const active = selectedSubject === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(subj)}
                    className={`relative px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="recorded-subject-tab"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute inset-0 bg-[#E11D2E] rounded-sm"
                      />
                    )}
                    <span className="relative z-10">{subj}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Recorded Video Player */}
        {playingVideo && (
          <AnimatePresence mode="wait">
            <motion.div
              key={playingVideo.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 border border-zinc-800 rounded-sm bg-[#14141B] overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-8 bg-black aspect-video flex items-center justify-center">
                  {hasTierAccess(
                    student?.plan,
                    playingVideo.requiredTier,
                    Boolean(isActiveStudent),
                    isOwner
                  ) ? (
                    getYoutubeEmbed(playingVideo.videoUrl) ? (
                      <iframe
                        src={getYoutubeEmbed(playingVideo.videoUrl)!}
                        title={playingVideo.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        key={playingVideo.id}
                        src={resolveAuthorizedVideoUrl(playingVideo)}
                        controls
                        controlsList="nodownload"
                        className="w-full h-full object-contain bg-black"
                      />
                    )
                  ) : (
                    <div className="p-8 text-center text-white max-w-md">
                      <Lock className="w-8 h-8 text-[#E11D2E] mx-auto mb-3" />
                      <h3 className="text-lg font-bold uppercase mb-2">
                        {formatTierLabel(playingVideo.requiredTier)} Plan Required
                      </h3>
                      <p className="text-sm text-zinc-400 mb-5">
                        {student && student.status === 'pending'
                          ? `Your Student Login ID (${student.loginId}) is awaiting owner approval to stream this lecture.`
                          : 'Sign in with an approved Student Login ID or register to stream full recorded class videos.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onOpenAuth('login')}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#E11D2E] hover:bg-[#C81929] text-white rounded-sm cursor-pointer"
                        >
                          Sign In with Login ID
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onClick={() =>
                            onOpenAuth(
                              'register',
                              playingVideo.requiredTier === 'free' ? 'foundation' : playingVideo.requiredTier
                            )
                          }
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white rounded-sm cursor-pointer"
                        >
                          Register Student
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-800">
                  <div>
                    <div className="text-xs text-zinc-400 mb-2">
                      <span className="text-[#E11D2E] font-semibold">{playingVideo.subject}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">{playingVideo.duration}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{formatTierLabel(playingVideo.requiredTier)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{playingVideo.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      {playingVideo.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-400">
                    Instructor: <span className="font-semibold text-white">{playingVideo.instructor}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Recorded Lecture Grid */}
        {filtered.length === 0 ? (
          <div className="p-8 border border-zinc-800 rounded-sm bg-[#14141B] text-center text-sm text-zinc-400">
            No recorded lectures match your current filter.
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((vid) => {
                const unlocked = hasTierAccess(
                  student?.plan,
                  vid.requiredTier,
                  Boolean(isActiveStudent),
                  isOwner
                );
                const isSelected = playingVideo?.id === vid.id;
                return (
                  <motion.div
                    layout
                    key={vid.id}
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={`p-5 rounded-sm border bg-[#14141B] flex flex-col justify-between transition-colors ${
                      isSelected ? 'border-[#E11D2E]' : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                        <span>{vid.subject} · {formatTierLabel(vid.requiredTier)}</span>
                        <span className="font-mono tabular-nums">{vid.duration}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">{vid.title}</h3>
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-4">{vid.description}</p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                      <span className="text-xs text-zinc-400 truncate">{vid.instructor}</span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPlayingVideo(vid)}
                        className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          unlocked
                            ? 'bg-[#E11D2E] text-white hover:bg-[#C81929]'
                            : 'bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            {isSelected ? <Video className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isSelected ? 'Playing' : 'Watch Lecture'}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Preview Lock</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
