import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  CourseTrack,
  LiveClassItem,
  PricingPlan,
  RecordedVideoItem,
  StudyPdfItem
} from '../types';

export const DEFAULT_COURSES: CourseTrack[] = [
  {
    id: 'course_class_10th',
    title: 'Class 10th Board Foundation',
    category: 'Class 10th',
    kicker: 'CBSE & State Board · Maths, Science & IT',
    monthlyInr: 999,
    fullCourseInr: 8999,
    monthlyUsd: 14,
    fullCourseUsd: 119,
    durationLabel: 'Full Academic Year',
    scheduleLabel: 'Mon–Fri · 5:00 PM – 6:15 PM IST',
    requiredTier: 'foundation',
    highlights: [
      'Daily live NCERT concept classes & board numericals',
      'Chapter-wise Class 10th PDF notes & sample papers',
      'Full HD recorded backups for revision anytime',
      'Bi-weekly board pattern unit tests with evaluation'
    ],
    order: 1
  },
  {
    id: 'course_class_12th',
    title: 'Class 12th Board & Science + CS',
    category: 'Class 12th',
    kicker: 'Board Mastery · Physics, Maths & Python CS',
    monthlyInr: 1499,
    fullCourseInr: 13999,
    monthlyUsd: 19,
    fullCourseUsd: 179,
    durationLabel: '12 Months · Live + Recorded',
    scheduleLabel: 'Mon–Sat · 7:00 PM – 8:30 PM IST',
    requiredTier: 'pro',
    highlights: [
      'Calculus, Electromagnetism, Python & SQL live labs',
      'Previous 10 years board question bank PDFs',
      'Live doubt-clearing clinics after every module',
      'Practical viva & project documentation guidance'
    ],
    order: 2
  },
  {
    id: 'course_computer_basic',
    title: 'Computer Basic & Office Mastery',
    category: 'Computer Basic',
    kicker: 'Beginner Friendly · Practical Skills',
    monthlyInr: 699,
    fullCourseInr: 2499,
    monthlyUsd: 9,
    fullCourseUsd: 35,
    durationLabel: '3 Months · Certificate Track',
    scheduleLabel: 'Mon–Fri · 10:00 AM or 6:30 PM IST',
    requiredTier: 'free',
    highlights: [
      'Computer fundamentals, Windows OS & file management',
      'MS Word formatting, Excel formulas & PowerPoint decks',
      'Internet safety, email etiquette & Hindi/English typing',
      'Step-by-step practice PDF sheets & recorded tutorials'
    ],
    order: 3
  }
];

export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'plan_foundation',
    name: 'Foundation',
    kicker: 'Class 10th & Weekend Live Access',
    tierKey: 'foundation',
    monthlyInr: 999,
    quarterlyInr: 2549,
    annualInr: 8999,
    monthlyUsd: 14,
    quarterlyUsd: 36,
    annualUsd: 119,
    description: 'Ideal for Class 10th students & Computer Basic learners needing recorded videos, PDFs, and weekend live clinics.',
    features: [
      'Class 10th & Computer Basic live doubt clinics',
      'Full access to Foundation recorded lecture archive',
      'Chapter-wise downloadable PDF notes & problem sets',
      'Weekly self-graded checkpoint quizzes',
      'Dedicated Student Login ID portal access'
    ],
    highlighted: false,
    order: 1
  },
  {
    id: 'plan_cohort_pro',
    name: 'Cohort Pro',
    kicker: 'Most Enrolled · Class 12th & Daily Live',
    tierKey: 'pro',
    monthlyInr: 1499,
    quarterlyInr: 3825,
    annualInr: 13999,
    monthlyUsd: 19,
    quarterlyUsd: 49,
    annualUsd: 179,
    description: 'Complete Class 12th, Class 10th & Computer Basic daily live classes with real-time Q&A, recordings, and all PDFs.',
    features: [
      'Daily 90-minute interactive live classes (Mon–Sat)',
      'Complete HD recorded video library within 2 hours of class',
      'All annotated class board PDFs & practice workbooks',
      'Live in-class doubt queue with direct mentor replies',
      'Bi-weekly full-length mock tests with detailed solutions',
      'Priority batch seat guarantee (1:18 mentor ratio)'
    ],
    highlighted: true,
    order: 2
  },
  {
    id: 'plan_scholar',
    name: 'Scholar 1:1',
    kicker: 'Personal Mentorship + All Courses',
    tierKey: 'scholar',
    monthlyInr: 3499,
    quarterlyInr: 8920,
    annualInr: 30200,
    monthlyUsd: 45,
    quarterlyUsd: 115,
    annualUsd: 389,
    description: 'All Class 10th, Class 12th & Computer courses plus weekly 1-on-1 personal faculty mentorship and paper reviews.',
    features: [
      'All daily live cohorts, recorded archives & PDF vaults',
      'Weekly 45-minute 1-on-1 faculty mentorship session',
      'Custom board & exam preparation roadmap',
      'Direct answer-sheet, code & project line-by-line review',
      'Mock viva & practical examination prep labs'
    ],
    highlighted: false,
    order: 3
  }
];

export const DEFAULT_LIVE_CLASSES: LiveClassItem[] = [
  {
    id: 'live_computer_basic_excel',
    title: 'Computer Basic: MS Excel Formulas, Tables & Shortcut Keys',
    subject: 'Computer Basic',
    instructor: 'Dr. Ananya Rao',
    batchTime: 'Today · 6:30 PM – 7:30 PM IST',
    durationMinutes: 60,
    status: 'live',
    streamUrl: '',
    requiredTier: 'free',
    seatsRemaining: 18,
    topicNotes: 'Hands-on beginner session covering SUM, AVERAGE, IF formulas, formatting marksheets, and essential keyboard shortcuts.'
  },
  {
    id: 'live_class10_quadratics',
    title: 'Class 10th Maths: Quadratic Equations & Board Word Problems',
    subject: 'Class 10th',
    instructor: 'Prof. Rohan Kulkarni',
    batchTime: 'Today · 5:00 PM – 6:15 PM IST',
    durationMinutes: 75,
    status: 'upcoming',
    streamUrl: '',
    requiredTier: 'foundation',
    seatsRemaining: 15,
    topicNotes: 'Factorization, discriminant nature of roots, and previous 5-year Class 10th board questions.'
  },
  {
    id: 'live_class12_electrostatics',
    title: 'Class 12th Physics & CS: Gauss Law & Python File Handling',
    subject: 'Class 12th',
    instructor: 'Dr. Meera Iyer',
    batchTime: 'Today · 7:45 PM – 9:15 PM IST',
    durationMinutes: 90,
    status: 'upcoming',
    streamUrl: '',
    requiredTier: 'pro',
    seatsRemaining: 11,
    topicNotes: 'Board derivation walkthroughs for electric flux along with Class 12th Python CSV/binary file programs.'
  },
  {
    id: 'live_dsa_graphs',
    title: 'Graph Algorithms: Shortest Paths & Topological Ordering',
    subject: 'Computer Science',
    instructor: 'Dr. Ananya Rao',
    batchTime: 'Tomorrow · 7:30 PM – 9:00 PM IST',
    durationMinutes: 90,
    status: 'upcoming',
    streamUrl: '',
    requiredTier: 'pro',
    seatsRemaining: 14,
    topicNotes: 'Live walkthrough of Dijkstra with priority queues, negative edge caveats, and DAG shortest path proofs.'
  }
];

export const DEFAULT_RECORDED_VIDEOS: RecordedVideoItem[] = [
  {
    id: 'rec_computer_basic_01',
    title: 'Computer Basic L01: MS Word Document Formatting & Resume Setup',
    subject: 'Computer Basic',
    instructor: 'Dr. Ananya Rao',
    duration: '42:15',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    isLocalUpload: false,
    requiredTier: 'free',
    description: 'Beginner-friendly recorded class on page layout, tables, headers, and clean PDF export in MS Word.'
  },
  {
    id: 'rec_class10_trig_01',
    title: 'Class 10th Maths L01: Introduction to Trigonometry & Identities',
    subject: 'Class 10th',
    instructor: 'Prof. Rohan Kulkarni',
    duration: '56:20',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    isLocalUpload: false,
    requiredTier: 'foundation',
    description: 'Complete NCERT Class 10th Chapter 8 lecture covering trigonometric ratios, standard angles, and board proofs.'
  },
  {
    id: 'rec_class12_calculus_01',
    title: 'Class 12th Maths L01: Continuity, Differentiability & Chain Rule',
    subject: 'Class 12th',
    instructor: 'Prof. Rohan Kulkarni',
    duration: '1:08:30',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    isLocalUpload: false,
    requiredTier: 'pro',
    description: 'Class 12th board foundation on left-hand/right-hand limits, derivatives of inverse trig functions, and NCERT examples.'
  }
];

export const DEFAULT_STUDY_PDFS: StudyPdfItem[] = [
  {
    id: 'pdf_calculus_sample',
    title: 'Computer Basic & Maths Formula Starter Pack (Sample PDF)',
    subject: 'Computer Basic',
    chapter: 'Module 01 · Starter Guide',
    fileUrl: '/api/media/pdf/takshila_calculus_notes_sample.pdf',
    fileName: 'takshila_calculus_notes_sample.pdf',
    fileSizeLabel: '18 KB',
    requiredTier: 'free'
  },
  {
    id: 'pdf_class10_ncert_sheet',
    title: 'Class 10th Board Mathematics: Quadratic & Trigonometry Sheet',
    subject: 'Class 10th',
    chapter: 'Class 10th · Chapters 4 & 8',
    fileUrl: '/api/media/pdf/takshila_calculus_notes_sample.pdf',
    fileName: 'class10_maths_board_sheet.pdf',
    fileSizeLabel: '1.2 MB',
    requiredTier: 'foundation'
  },
  {
    id: 'pdf_class12_physics_cs',
    title: 'Class 12th Physics Derivations & Python File Handling Notes',
    subject: 'Class 12th',
    chapter: 'Class 12th · Unit 1 & Python',
    fileUrl: '/api/media/pdf/takshila_calculus_notes_sample.pdf',
    fileName: 'class12_physics_cs_notes.pdf',
    fileSizeLabel: '2.4 MB',
    requiredTier: 'pro'
  }
];

export const MENTORS = [
  {
    name: 'Dr. Ananya Rao',
    role: 'Computer Basic, Python & Systems',
    credentials: 'Ph.D. Computer Science · 9 yrs teaching experience',
    image: '/src/assets/images/mentor_ananya_1794543792697.jpg',
    bio: 'Teaches Computer Basic, MS Office automation, Class 12th Python/SQL, and live coding cohorts.'
  },
  {
    name: 'Prof. Rohan Kulkarni',
    role: 'Class 10th & Class 12th Mathematics',
    credentials: 'M.Sc. Mathematics, IIT Bombay · 12 yrs faculty',
    image: '/src/assets/images/mentor_rohan_1794543792621.jpg',
    bio: 'Specializes in board exam mastery for Class 10th and Class 12th calculus, algebra, and trigonometry.'
  },
  {
    name: 'Dr. Meera Iyer',
    role: 'Class 10th & 12th Science / Physics',
    credentials: 'Ph.D. Applied Physics · 10 yrs research & mentoring',
    image: '/src/assets/images/mentor_meera_1794543792762.jpg',
    bio: 'Guides learners through board physics derivations, numericals, and practical exam preparation.'
  }
];

export const STUDENT_OUTCOMES = [
  {
    name: 'Siddharth Nair',
    cohort: 'Class 12th Cohort Pro · 2026',
    before: 'Struggled with integration and electrostatics numericals (58%)',
    outcome: 'Scored 95% in Class 12th Board Pre-Finals after 14 weeks of live doubt classes.'
  },
  {
    name: 'Ishita Deshmukh',
    cohort: 'Class 10th Foundation · 2026',
    before: 'Needed structured NCERT revision and weekly test feedback',
    outcome: 'Completed 40+ live classes & chapter PDFs; scored 97/100 in Class 10th Mathematics.'
  },
  {
    name: 'Kabir Malhotra',
    cohort: 'Computer Basic · 2026',
    before: 'Zero prior experience with Excel spreadsheets or office documents',
    outcome: 'Mastered Word, Excel VLOOKUP/Pivot basics, and typing speed of 42 WPM in 8 weeks.'
  }
];

async function seedMissingDocs<T extends { id: string }>(
  collectionName: string,
  items: T[],
  timestampField: 'updatedAt' | 'createdAt'
): Promise<void> {
  const snap = await getDocs(collection(db, collectionName));
  const existingIds = new Set(snap.docs.map((d) => d.id));
  for (const item of items) {
    if (!existingIds.has(item.id)) {
      await setDoc(doc(db, collectionName, item.id), {
        ...item,
        [timestampField]: serverTimestamp()
      });
    }
  }
}

export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    await seedMissingDocs('courses', DEFAULT_COURSES, 'updatedAt');
    await seedMissingDocs('pricingPlans', DEFAULT_PRICING_PLANS, 'updatedAt');
    await seedMissingDocs('liveClasses', DEFAULT_LIVE_CLASSES, 'updatedAt');
    await seedMissingDocs('recordedVideos', DEFAULT_RECORDED_VIDEOS, 'createdAt');
    await seedMissingDocs('studyPdfs', DEFAULT_STUDY_PDFS, 'createdAt');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedFirestoreIfEmpty');
  }
}
