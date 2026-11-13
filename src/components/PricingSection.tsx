import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';
import {
  formatTierLabel,
  type BillingCycle,
  type CourseTrack,
  type CurrencyCode,
  type PlanTier,
  type PricingPlan
} from '../types';

interface PricingSectionProps {
  courses: CourseTrack[];
  plans: PricingPlan[];
  onSelectPlan: (tier: PlanTier, courseTitle?: string) => void;
}

export function PricingSection({ courses, plans, onSelectPlan }: PricingSectionProps) {
  const [billing, setBilling] = useState<BillingCycle>('quarterly');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [slideDir, setSlideDir] = useState<1 | -1>(1);

  const sortedCourses = [...courses].sort((a, b) => a.order - b.order);
  const categories = ['All', ...Array.from(new Set(sortedCourses.map((c) => c.category)))];
  const filteredCourses =
    selectedCategory === 'All'
      ? sortedCourses
      : sortedCourses.filter((c) => c.category === selectedCategory);

  const activeSelectedCourse =
    filteredCourses.find((c) => c.id === selectedCourseId) ||
    filteredCourses[0] ||
    sortedCourses[0];

  const activeCourseIdx = sortedCourses.findIndex((c) => c.id === activeSelectedCourse?.id);

  function stepSelectedCourse(dir: -1 | 1) {
    if (sortedCourses.length === 0) return;
    setSlideDir(dir);
    const nextIdx = (Math.max(0, activeCourseIdx) + dir + sortedCourses.length) % sortedCourses.length;
    const nextCourse = sortedCourses[nextIdx];
    setSelectedCategory('All');
    setSelectedCourseId(nextCourse.id);
  }

  const sortedPlans = [...plans].sort((a, b) => a.order - b.order);

  function getPrice(plan: PricingPlan): { amount: string; suffix: string } {
    if (currency === 'INR') {
      const val =
        billing === 'monthly'
          ? plan.monthlyInr
          : billing === 'quarterly'
            ? plan.quarterlyInr
            : plan.annualInr;
      const suffix = billing === 'monthly' ? '/ month' : billing === 'quarterly' ? '/ quarter' : '/ year';
      return { amount: `₹${val.toLocaleString('en-IN')}`, suffix };
    }
    const val =
      billing === 'monthly'
        ? plan.monthlyUsd
        : billing === 'quarterly'
          ? plan.quarterlyUsd
          : plan.annualUsd;
    const suffix = billing === 'monthly' ? '/ month' : billing === 'quarterly' ? '/ quarter' : '/ year';
    return { amount: `$${val.toLocaleString('en-US')}`, suffix };
  }

  return (
    <section id="pricing" className="py-16 border-t border-zinc-800 bg-[#0E0E13] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Course Catalog & Batch Pricing */}
        <div className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
                04. Courses &amp; Tuition Pricing
              </p>
              <h2
                className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white text-balance"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Class 10th, Class 12th &amp; Computer Basic Courses
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 mt-2">
                Click or slide through any course batch below to inspect full course details, monthly fees, and live class schedules.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start">
              {/* Animated Course Category Tabs */}
              <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm">
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        const match =
                          cat === 'All'
                            ? sortedCourses[0]
                            : sortedCourses.find((c) => c.category === cat);
                        if (match) {
                          setSlideDir(1);
                          setSelectedCourseId(match.id);
                        }
                      }}
                      className={`relative px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="pricing-cat-tab"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="absolute inset-0 bg-[#E11D2E] rounded-sm"
                        />
                      )}
                      <span className="relative z-10">{cat === 'All' ? 'All Courses' : cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Animated Currency Toggle */}
              <div className="inline-flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm">
                {(['INR', 'USD'] as CurrencyCode[]).map((curr) => {
                  const active = currency === curr;
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrency(curr)}
                      className={`relative px-3 py-1.5 text-xs font-mono font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active ? 'text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="pricing-currency-tab"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="absolute inset-0 bg-zinc-800 rounded-sm"
                        />
                      )}
                      <span className="relative z-10">{curr === 'INR' ? 'INR ₹' : 'USD $'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Animated Course Selection Grid */}
          <motion.div layout className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <AnimatePresence mode="popLayout">
              {filteredCourses.map((course, idx) => {
                const monthlyPrice =
                  currency === 'INR'
                    ? `₹${course.monthlyInr.toLocaleString('en-IN')}`
                    : `$${course.monthlyUsd.toLocaleString('en-US')}`;
                const fullPrice =
                  currency === 'INR'
                    ? `₹${course.fullCourseInr.toLocaleString('en-IN')}`
                    : `$${course.fullCourseUsd.toLocaleString('en-US')}`;
                const isSelected = activeSelectedCourse?.id === course.id;

                return (
                  <motion.div
                    layout
                    key={course.id}
                    initial={{ opacity: 0, y: 18, scale: 0.97 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: isSelected ? 1.015 : 1
                    }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => {
                      setSlideDir(idx >= Math.max(0, activeCourseIdx) ? 1 : -1);
                      setSelectedCourseId(course.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCourseId(course.id);
                      }
                    }}
                    className={`relative rounded-sm p-6 bg-[#14141B] flex flex-col justify-between cursor-pointer text-left transition-colors ${
                      isSelected ? 'border border-[#E11D2E]' : 'border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="selected-course-ring"
                        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                        className="absolute inset-0 rounded-sm border-2 border-[#E11D2E] pointer-events-none"
                      />
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-2">
                        <span className="font-semibold uppercase tracking-wider text-[#E11D2E]">
                          {course.category}
                        </span>
                        <span className="font-mono text-zinc-300">
                          {isSelected ? 'Selected' : formatTierLabel(course.requiredTier)}
                        </span>
                      </div>
                      <h3
                        className="text-2xl font-extrabold uppercase tracking-tight text-white"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {course.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">{course.kicker}</p>

                      <div className="mt-5 pb-5 border-b border-zinc-800 flex items-baseline justify-between gap-4">
                        <div>
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={`${course.id}-${currency}-mo`}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              transition={{ duration: 0.2 }}
                              className="text-3xl font-bold text-white font-mono tabular-nums inline-block"
                            >
                              {monthlyPrice}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-xs text-zinc-400 ml-1">/ month</span>
                        </div>
                        <div className="text-right">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={`${course.id}-${currency}-full`}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.2 }}
                              className="text-sm font-semibold text-zinc-200 font-mono tabular-nums"
                            >
                              {fullPrice}
                            </motion.div>
                          </AnimatePresence>
                          <div className="text-[11px] text-zinc-400">Full course fee</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#E11D2E] shrink-0" />
                          <span>{course.scheduleLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-[#E11D2E] shrink-0" />
                          <span>{course.durationLabel}</span>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-2.5">
                        {course.highlights.map((item, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-2 text-sm text-zinc-300">
                            <Check className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseId(course.id);
                        onSelectPlan(course.requiredTier, course.title);
                      }}
                      className={`mt-7 w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#E11D2E] text-white hover:bg-[#C81929]'
                          : 'bg-zinc-900 border border-zinc-700 text-white hover:border-[#E11D2E]'
                      }`}
                    >
                      Enroll in {course.category}
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Animated Course Detail Show Drawer below Pricing Cards */}
          {activeSelectedCourse && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E11D2E]" />
                  Selected Course Detail Show
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepSelectedCourse(-1)}
                    className="p-1.5 rounded-sm bg-zinc-900 border border-zinc-800 hover:border-[#E11D2E] text-zinc-200 cursor-pointer"
                    aria-label="Slide to previous course"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepSelectedCourse(1)}
                    className="p-1.5 rounded-sm bg-zinc-900 border border-zinc-800 hover:border-[#E11D2E] text-zinc-200 cursor-pointer"
                    aria-label="Slide to next course"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSelectedCourse.id}
                  initial={{ opacity: 0, x: slideDir * 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: slideDir * -36 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="p-5 sm:p-6 rounded-sm bg-[#14141B] border border-[#E11D2E]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#E11D2E]">
                      {activeSelectedCourse.category} · {formatTierLabel(activeSelectedCourse.requiredTier)}
                    </div>
                    <h3
                      className="text-2xl font-extrabold uppercase text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {activeSelectedCourse.title}
                    </h3>
                    <p className="text-xs text-zinc-300">
                      {activeSelectedCourse.scheduleLabel} · {activeSelectedCourse.durationLabel} ·{' '}
                      <span className="font-mono font-bold text-white">
                        {currency === 'INR'
                          ? `₹${activeSelectedCourse.monthlyInr.toLocaleString('en-IN')}/mo (Full: ₹${activeSelectedCourse.fullCourseInr.toLocaleString('en-IN')})`
                          : `$${activeSelectedCourse.monthlyUsd.toLocaleString('en-US')}/mo (Full: $${activeSelectedCourse.fullCourseUsd.toLocaleString('en-US')})`}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
                      {activeSelectedCourse.highlights.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-[#E11D2E]" />
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      onSelectPlan(activeSelectedCourse.requiredTier, activeSelectedCourse.title)
                    }
                    className="px-6 py-3 rounded-sm bg-[#E11D2E] hover:bg-[#C81929] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 whitespace-nowrap self-start lg:self-center cursor-pointer shrink-0"
                  >
                    <span>Continue With {activeSelectedCourse.category}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* All-Access Cohort Membership Tiers */}
        <div className="pt-12 border-t border-zinc-800">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
                All-Access Membership Tiers
              </p>
              <h3
                className="text-3xl font-extrabold uppercase tracking-tight text-white text-balance"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Bundle Live Classes, Recorded Library &amp; PDFs
              </h3>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm self-start">
              {(['monthly', 'quarterly', 'annual'] as BillingCycle[]).map((cycle) => {
                const active = billing === cycle;
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBilling(cycle)}
                    className={`relative px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active ? 'text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="pricing-billing-tab"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className="absolute inset-0 bg-[#E11D2E] rounded-sm"
                      />
                    )}
                    <span className="relative z-10">
                      {cycle === 'monthly'
                        ? 'Monthly'
                        : cycle === 'quarterly'
                          ? 'Quarterly · Save 15%'
                          : 'Annual · Save 28%'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-12">
            {sortedPlans.map((plan, idx) => {
              const price = getPrice(plan);
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  className={`rounded-sm p-6 flex flex-col justify-between bg-[#14141B] border ${
                    plan.highlighted
                      ? 'border-[#E11D2E] ring-1 ring-[#E11D2E]'
                      : 'border-zinc-800'
                  }`}
                >
                  <div>
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                        plan.highlighted ? 'text-[#E11D2E]' : 'text-zinc-400'
                      }`}
                    >
                      {plan.kicker}
                    </p>
                    <h3
                      className="text-2xl font-extrabold uppercase text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {plan.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-2 min-h-[40px]">{plan.description}</p>

                    <div className="mt-6 pb-6 border-b border-zinc-800 flex items-baseline gap-2">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.id}-${billing}-${currency}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }}
                          className="text-3xl font-bold tracking-tight text-white font-mono tabular-nums inline-block"
                        >
                          {price.amount}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm text-zinc-400">{price.suffix}</span>
                    </div>

                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 text-sm text-zinc-300">
                          <Check className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelectPlan(plan.tierKey)}
                    className={`mt-8 w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer ${
                      plan.highlighted
                        ? 'bg-[#E11D2E] text-white hover:bg-[#C81929]'
                        : 'bg-zinc-900 border border-zinc-700 text-white hover:border-[#E11D2E]'
                    }`}
                  >
                    Register for {plan.name}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>

          {/* Comparison Table */}
          <div className="border border-zinc-800 rounded-sm bg-[#14141B] overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h3 className="text-base font-bold uppercase tracking-wide text-white">
                Plan Feature Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-5">Included Capability</th>
                    <th className="py-3 px-4">Foundation</th>
                    <th className="py-3 px-4 text-[#E11D2E]">Cohort Pro</th>
                    <th className="py-3 px-4">Scholar 1:1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  <tr>
                    <td className="py-3 px-5 font-medium text-white">Courses Included</td>
                    <td className="py-3 px-4">Class 10th + Computer Basic</td>
                    <td className="py-3 px-4 font-semibold text-white">Class 10th, 12th &amp; Computer</td>
                    <td className="py-3 px-4">All Courses + 1:1 Mentoring</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-white">Live Interactive Classes</td>
                    <td className="py-3 px-4 font-mono tabular-nums">3 / week</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-white">6 / week (Daily)</td>
                    <td className="py-3 px-4 font-mono tabular-nums">6 / week + 1:1</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-white">Recorded HD Video Archive</td>
                    <td className="py-3 px-4">Foundation Tracks</td>
                    <td className="py-3 px-4 font-semibold text-white">All Cohort Tracks</td>
                    <td className="py-3 px-4">All Tracks + Custom</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-white">Downloadable Study PDFs</td>
                    <td className="py-3 px-4">Chapter Notes</td>
                    <td className="py-3 px-4 font-semibold text-white">Notes + Annotated Boards</td>
                    <td className="py-3 px-4">All PDFs + Graded Sheets</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-medium text-white">Batch Mentor Ratio</td>
                    <td className="py-3 px-4 font-mono tabular-nums">1 : 35</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-white">1 : 18</td>
                    <td className="py-3 px-4 font-mono tabular-nums">1 : 1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
