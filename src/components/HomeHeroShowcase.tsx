import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Pause,
  Play,
  Radio,
  Video
} from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import { formatTierLabel, type CourseTrack, type CurrencyCode, type PlanTier } from '../types';

interface HomeHeroShowcaseProps {
  courses: CourseTrack[];
  liveCountBySubject: Record<string, number>;
  videoCountBySubject: Record<string, number>;
  pdfCountBySubject: Record<string, number>;
  onStartLearning: () => void;
  onOpenLogin: (tab?: 'login' | 'register' | 'owner', plan?: PlanTier, courseTitle?: string) => void;
}

const COURSE_VISUALS: Record<string, string> = {
  'Class 10th': '/src/assets/images/live_session_board_1794543792607.jpg',
  'Class 12th': '/src/assets/images/hero_live_classroom_1794543791591.jpg',
  'Computer Basic': '/src/assets/images/mentor_ananya_1794543792697.jpg'
};

function getCourseImage(course: CourseTrack, idx: number): string {
  if (COURSE_VISUALS[course.category]) return COURSE_VISUALS[course.category];
  const fallbacks = [
    '/src/assets/images/hero_live_classroom_1794543791591.jpg',
    '/src/assets/images/live_session_board_1794543792607.jpg',
    '/src/assets/images/mentor_ananya_1794543792697.jpg'
  ];
  return fallbacks[idx % fallbacks.length];
}

export function HomeHeroShowcase({
  courses,
  liveCountBySubject,
  videoCountBySubject,
  pdfCountBySubject,
  onStartLearning,
  onOpenLogin
}: HomeHeroShowcaseProps) {
  const sortedCourses = [...courses].sort((a, b) => a.order - b.order);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [autoSlide, setAutoSlide] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');

  const safeIndex = sortedCourses.length > 0 ? activeIndex % sortedCourses.length : 0;
  const activeCourse = sortedCourses[safeIndex];

  useEffect(() => {
    if (!autoSlide || sortedCourses.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideDir(1);
      setActiveIndex((prev) => (prev + 1) % sortedCourses.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoSlide, sortedCourses.length]);

  function selectCourse(index: number) {
    if (sortedCourses.length === 0) return;
    setAutoSlide(false);
    setSlideDir(index >= safeIndex ? 1 : -1);
    setActiveIndex(index);
  }

  function stepCourse(dir: -1 | 1) {
    if (sortedCourses.length === 0) return;
    setAutoSlide(false);
    setSlideDir(dir);
    setActiveIndex((prev) => (prev + dir + sortedCourses.length) % sortedCourses.length);
  }

  // Visible 3-card window that shifts cleanly if owner adds more than 3 courses
  const visibleWindow: Array<{ course: CourseTrack; originalIndex: number }> = [];
  if (sortedCourses.length <= 3) {
    sortedCourses.forEach((course, idx) => visibleWindow.push({ course, originalIndex: idx }));
  } else {
    for (let offset = 0; offset < 3; offset++) {
      const idx = (safeIndex + offset) % sortedCourses.length;
      visibleWindow.push({ course: sortedCourses[idx], originalIndex: idx });
    }
  }

  const activeVisual = activeCourse ? getCourseImage(activeCourse, safeIndex) : '/src/assets/images/hero_live_classroom_1794543791591.jpg';
  const activeLiveCount = activeCourse ? liveCountBySubject[activeCourse.category] || 1 : 1;
  const activeVideoCount = activeCourse ? videoCountBySubject[activeCourse.category] || 1 : 1;
  const activePdfCount = activeCourse ? pdfCountBySubject[activeCourse.category] || 1 : 1;

  return (
    <section className="relative bg-[#09090B] text-white overflow-hidden pt-8 pb-16">
      {/* Crimson Atmospheric Radial Backlight matching reference */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 74% 34%, rgba(225, 29, 46, 0.36) 0%, rgba(185, 28, 28, 0.12) 38%, rgba(9, 9, 11, 0) 68%)'
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top Hero Split: Bold Condensed Copy + Crimson Studio Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[430px]">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-6 z-10"
          >
            <p className="text-xs font-semibold tracking-[0.22em] text-[#E11D2E] uppercase">
              Radha Education · Next-Gen Live Learning
            </p>

            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight leading-[0.92] text-balance"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="block text-white">We Build</span>
              <span className="block text-[#E11D2E]">Scholars</span>
              <span className="block text-white">That Win.</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 max-w-md leading-relaxed">
              Radha Education delivers daily live classes, HD recorded lectures, and chapter PDFs for Class 10th, Class 12th, and Computer Basic batches.
            </p>

            {/* 3-Column Crimson Stat Strip */}
            <div className="grid grid-cols-3 gap-6 pt-2 max-w-md">
              <div>
                <div
                  className="text-3xl sm:text-4xl font-extrabold text-[#E11D2E] font-mono tabular-nums leading-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  18,400+
                </div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-zinc-400 mt-1.5">
                  Students
                </div>
              </div>
              <div>
                <div
                  className="text-3xl sm:text-4xl font-extrabold text-[#E11D2E] font-mono tabular-nums leading-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  3 Tracks
                </div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-zinc-400 mt-1.5">
                  10th · 12th · Basic
                </div>
              </div>
              <div>
                <div
                  className="text-3xl sm:text-4xl font-extrabold text-[#E11D2E] font-mono tabular-nums leading-none"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  98%
                </div>
                <div className="text-[11px] font-medium tracking-wider uppercase text-zinc-400 mt-1.5">
                  Board Results
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Dramatic Studio Visual synced to Active Course */}
          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[16/11] lg:aspect-[5/4] rounded-sm overflow-hidden border border-zinc-800/80 bg-[#121218]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCourse ? `${activeCourse.id}-visual` : 'default-visual'}
                  initial={{ opacity: 0, x: slideDir * 36, scale: 1.03 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: slideDir * -36, scale: 0.98 }}
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full relative"
                >
                  <ResilientImage
                    src={activeVisual}
                    alt={
                      activeCourse
                        ? `${activeCourse.title} live classroom studio at Radha Education`
                        : 'Radha Education live classroom studio'
                    }
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-[#09090B]/90 via-[#09090B]/20 to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/30"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Subtle Track Overlay Bottom-Right matching reference "TRUSTED BY" */}
              <div className="absolute bottom-4 right-4 left-4 flex flex-wrap items-end justify-between gap-4 z-10">
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-400">
                    Active Spotlight
                  </div>
                  <div className="text-sm font-bold text-white">
                    {activeCourse?.category || 'Class 10th'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-400 mb-1">
                    Batch Streams
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold tracking-wider uppercase text-zinc-200">
                    <span>10th</span>
                    <span className="text-[#E11D2E]" aria-hidden="true">/</span>
                    <span>12th</span>
                    <span className="text-[#E11D2E]" aria-hidden="true">/</span>
                    <span>Computer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hero Strip: Course Slide Cards + Right CTA Block (Matching Reference Image) */}
        <div id="featured-courses" className="mt-10 pt-8 border-t border-zinc-800/80 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          {/* Left 8 Columns: 3 Sliding Course Cards */}
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold tracking-[0.2em] text-[#E11D2E] uppercase">
                  Featured Courses · Click To Slide Details
                </span>
                <span className="text-xs font-mono text-zinc-400 tabular-nums">
                  {String(safeIndex + 1).padStart(2, '0')} / {String(Math.max(1, sortedCourses.length)).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoSlide((prev) => !prev)}
                  className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-sm inline-flex items-center gap-1.5 cursor-pointer"
                  aria-label={autoSlide ? 'Pause course slide' : 'Play course slide'}
                >
                  {autoSlide ? <Pause className="w-3 h-3 text-[#E11D2E]" /> : <Play className="w-3 h-3 text-[#E11D2E]" />}
                  <span>{autoSlide ? 'Auto Slide On' : 'Auto Slide Off'}</span>
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => stepCourse(-1)}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#E11D2E] text-white rounded-sm cursor-pointer"
                  aria-label="Previous course slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => stepCourse(1)}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#E11D2E] text-white rounded-sm cursor-pointer"
                  aria-label="Next course slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {visibleWindow.map(({ course, originalIndex }) => {
                const isActive = originalIndex === safeIndex;
                return (
                  <motion.button
                    key={course.id}
                    layout
                    type="button"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectCourse(originalIndex)}
                    className={`group relative text-left rounded-sm overflow-hidden bg-[#14141B] border transition-colors cursor-pointer ${
                      isActive ? 'border-[#E11D2E]' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="hero-course-outline"
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="absolute inset-0 border-2 border-[#E11D2E] pointer-events-none z-20"
                      />
                    )}

                    <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
                      <ResilientImage
                        src={getCourseImage(course, originalIndex)}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                        <span
                          className="text-lg font-extrabold uppercase tracking-wide text-white leading-none"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {course.category}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-[#E11D2E] bg-black/75 px-1.5 py-0.5 rounded-sm tabular-nums">
                          ₹{course.monthlyInr.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="text-xs font-bold text-white uppercase tracking-wide truncate">
                        {course.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {course.durationLabel}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right 4 Columns: "Ready to Create" CTA matching reference */}
          <div className="lg:col-span-4 lg:pl-6 lg:border-l lg:border-zinc-800/80 space-y-3">
            <h2
              className="text-2xl sm:text-3xl font-extrabold uppercase leading-[0.98] tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="block text-white">Ready To Start</span>
              <span className="block text-[#E11D2E]">Your Batch Journey?</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Register for a Student Login ID to join daily live classes, watch HD lectures, and download study PDFs.
            </p>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                onOpenLogin('register', activeCourse?.requiredTier || 'pro', activeCourse?.title)
              }
              className="w-full sm:w-auto px-6 py-3 bg-[#E11D2E] hover:bg-[#C81929] text-white text-xs font-bold tracking-wider uppercase rounded-sm transition-colors cursor-pointer"
            >
              Register / Login ID
            </motion.button>
          </div>
        </div>

        {/* Interactive Course Detail Show Panel (Slides Smoothly on Every Course Selection) */}
        {activeCourse && (
          <div className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeCourse.id}-${currency}`}
                initial={{ opacity: 0, x: slideDir * 44 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDir * -44 }}
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-sm bg-[#121218] border border-zinc-800 p-6 sm:p-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left: Course Header, Schedule, Syllabus */}
                  <div className="lg:col-span-8 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs font-medium text-zinc-400 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#E11D2E] uppercase tracking-wider">
                          Course Detail Show
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-white font-semibold">{activeCourse.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTierLabel(activeCourse.requiredTier)}</span>
                      </div>

                      {/* Currency Switch inside Detail Show */}
                      <div className="inline-flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm">
                        {(['INR', 'USD'] as CurrencyCode[]).map((curr) => (
                          <button
                            key={curr}
                            type="button"
                            onClick={() => setCurrency(curr)}
                            className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-sm transition-colors cursor-pointer ${
                              currency === curr
                                ? 'bg-[#E11D2E] text-white'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {curr === 'INR' ? 'INR ₹' : 'USD $'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3
                        className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {activeCourse.title}
                      </h3>
                      <p className="text-sm text-zinc-300 mt-1">{activeCourse.kicker}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-sm bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-[#E11D2E] shrink-0" />
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                            Live Batch Timing
                          </div>
                          <div className="text-xs font-semibold text-white mt-0.5">
                            {activeCourse.scheduleLabel}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-sm bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-[#E11D2E] shrink-0" />
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-zinc-400">
                            Course Duration
                          </div>
                          <div className="text-xs font-semibold text-white mt-0.5">
                            {activeCourse.durationLabel}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                        What You Get In This Course
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeCourse.highlights.map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.24, delay: idx * 0.05 }}
                            className="flex items-start gap-2 text-sm text-zinc-200"
                          >
                            <Check className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Pricing Summary & Instant Actions */}
                  <div className="lg:col-span-4 p-5 rounded-sm bg-[#09090B] border border-zinc-800 space-y-5">
                    <div className="pb-4 border-b border-zinc-800">
                      <div className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
                        Monthly Batch Fee
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold font-mono tabular-nums text-white">
                          {currency === 'INR'
                            ? `₹${activeCourse.monthlyInr.toLocaleString('en-IN')}`
                            : `$${activeCourse.monthlyUsd.toLocaleString('en-US')}`}
                        </span>
                        <span className="text-xs text-zinc-400">/ month</span>
                      </div>
                      <div className="mt-2 text-xs text-zinc-300 flex items-center justify-between">
                        <span>Full Course Package:</span>
                        <span className="font-mono font-bold text-[#E11D2E] tabular-nums">
                          {currency === 'INR'
                            ? `₹${activeCourse.fullCourseInr.toLocaleString('en-IN')}`
                            : `$${activeCourse.fullCourseUsd.toLocaleString('en-US')}`}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-zinc-400">
                          <Radio className="w-3.5 h-3.5 text-[#E11D2E]" />
                          Live Classes
                        </span>
                        <span className="font-mono font-semibold text-white tabular-nums">
                          {activeLiveCount} Active Track{activeLiveCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-zinc-400">
                          <Video className="w-3.5 h-3.5 text-[#E11D2E]" />
                          Recorded Lectures
                        </span>
                        <span className="font-mono font-semibold text-white tabular-nums">
                          {activeVideoCount} HD Module{activeVideoCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-zinc-400">
                          <FileText className="w-3.5 h-3.5 text-[#E11D2E]" />
                          Study PDFs
                        </span>
                        <span className="font-mono font-semibold text-white tabular-nums">
                          {activePdfCount} Notes Pack{activePdfCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          onOpenLogin('register', activeCourse.requiredTier, activeCourse.title)
                        }
                        className="w-full py-3 px-4 bg-[#E11D2E] hover:bg-[#C81929] text-white text-xs font-bold tracking-wider uppercase rounded-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Enroll in {activeCourse.category}</span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={onStartLearning}
                        className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold tracking-wider uppercase rounded-sm cursor-pointer"
                      >
                        Open Live Classroom
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
