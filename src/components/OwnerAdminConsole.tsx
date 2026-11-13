import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  BookOpen,
  FileUp,
  LogOut,
  Plus,
  Radio,
  ShieldCheck,
  Trash2,
  Users,
  Video,
  IndianRupee
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, OWNER_EMAIL } from '../lib/firebase';
import {
  formatTierLabel,
  type CourseTrack,
  type LiveClassItem,
  type PlanTier,
  type PricingPlan,
  type RecordedVideoItem,
  type StudentProfile,
  type StudyPdfItem
} from '../types';

interface OwnerAdminConsoleProps {
  ownerToken: string | null;
  courses: CourseTrack[];
  plans: PricingPlan[];
  liveClasses: LiveClassItem[];
  recordedVideos: RecordedVideoItem[];
  studyPdfs: StudyPdfItem[];
}

export function OwnerAdminConsole({
  ownerToken,
  courses,
  plans,
  liveClasses,
  recordedVideos,
  studyPdfs
}: OwnerAdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'pdfs' | 'videos' | 'live' | 'students' | 'courses' | 'pricing'>('courses');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PDF upload form
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSubject, setPdfSubject] = useState('Mathematics');
  const [pdfChapter, setPdfChapter] = useState('');
  const [pdfTier, setPdfTier] = useState<PlanTier>('pro');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Recorded video form
  const [videoMode, setVideoMode] = useState<'upload' | 'url'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSubject, setVideoSubject] = useState('Computer Science');
  const [videoInstructor, setVideoInstructor] = useState('Dr. Ananya Rao');
  const [videoDuration, setVideoDuration] = useState('45:00');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoTier, setVideoTier] = useState<PlanTier>('pro');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Live class form
  const [liveTitle, setLiveTitle] = useState('');
  const [liveSubject, setLiveSubject] = useState('Mathematics');
  const [liveInstructor, setLiveInstructor] = useState('Prof. Rohan Kulkarni');
  const [liveBatchTime, setLiveBatchTime] = useState('Today · 8:00 PM – 9:30 PM IST');
  const [liveDuration, setLiveDuration] = useState(90);
  const [liveStatus, setLiveStatus] = useState<'live' | 'upcoming' | 'ended'>('live');
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [liveTier, setLiveTier] = useState<PlanTier>('pro');
  const [liveSeats, setLiveSeats] = useState(20);
  const [liveNotes, setLiveNotes] = useState('');

  // Students management
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPlan, setNewStudentPlan] = useState<PlanTier>('pro');
  const [newStudentPassword, setNewStudentPassword] = useState('takshila123');

  // Pricing edits
  const [planEdits, setPlanEdits] = useState<Record<string, PricingPlan>>({});
  const [courseEdits, setCourseEdits] = useState<Record<string, CourseTrack>>({});

  // New Course form
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('Class 10th');
  const [courseKicker, setCourseKicker] = useState('Live Classes + Recorded + PDFs');
  const [courseMonthlyInr, setCourseMonthlyInr] = useState(999);
  const [courseFullInr, setCourseFullInr] = useState(8999);
  const [courseDuration, setCourseDuration] = useState('Full Academic Year');
  const [courseSchedule, setCourseSchedule] = useState('Mon–Fri · 5:00 PM IST');
  const [courseTier, setCourseTier] = useState<PlanTier>('foundation');
  const [courseHighlights, setCourseHighlights] = useState(
    'Live interactive classes\nRecorded video backups\nChapter-wise study PDFs'
  );

  useEffect(() => {
    const map: Record<string, PricingPlan> = {};
    for (const p of plans) map[p.id] = p;
    setPlanEdits(map);
  }, [plans]);

  useEffect(() => {
    const cmap: Record<string, CourseTrack> = {};
    for (const c of courses) cmap[c.id] = c;
    setCourseEdits(cmap);
  }, [courses]);

  async function fetchStudents() {
    if (!ownerToken) return;
    setLoadingStudents(true);
    try {
      const resp = await fetch('/api/admin/students', {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const data = (await resp.json()) as {
        students?: StudentProfile[];
        settings?: { autoApproveStudents: boolean };
      };
      if (resp.ok && data.students) {
        setStudents(data.students);
        if (data.settings) setAutoApprove(data.settings.autoApproveStudents);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStudents(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'students' && ownerToken) {
      fetchStudents();
    }
  }, [activeTab, ownerToken]);

  function clearAlerts() {
    setNotice(null);
    setErrorMsg(null);
  }

  async function handlePdfSubmit(e: FormEvent) {
    e.preventDefault();
    clearAlerts();
    if (!pdfFile || !ownerToken) {
      setErrorMsg('Please select a PDF file to upload.');
      return;
    }
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const uploadResp = await fetch('/api/upload/pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
        body: formData
      });
      const uploadData = (await uploadResp.json()) as {
        fileUrl?: string;
        fileName?: string;
        fileSizeLabel?: string;
        error?: string;
      };
      if (!uploadResp.ok || !uploadData.fileUrl) {
        setErrorMsg(uploadData.error || 'PDF upload failed.');
        return;
      }

      const id = `pdf_${Date.now()}`;
      try {
        await setDoc(doc(db, 'studyPdfs', id), {
          id,
          title: pdfTitle.trim(),
          subject: pdfSubject.trim(),
          chapter: pdfChapter.trim() || 'Class Notes',
          fileUrl: uploadData.fileUrl,
          fileName: uploadData.fileName || pdfFile.name,
          fileSizeLabel: uploadData.fileSizeLabel || 'PDF',
          requiredTier: pdfTier,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `studyPdfs/${id}`);
      }

      setNotice(`Published PDF "${pdfTitle.trim()}" successfully.`);
      setPdfFile(null);
      setPdfTitle('');
      setPdfChapter('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF upload failed.');
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleDeletePdf(id: string) {
    clearAlerts();
    try {
      await deleteDoc(doc(db, 'studyPdfs', id));
      setNotice('PDF removed from catalog.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `studyPdfs/${id}`);
    }
  }

  async function handleVideoSubmit(e: FormEvent) {
    e.preventDefault();
    clearAlerts();
    if (!ownerToken) return;
    setUploadingVideo(true);

    try {
      let finalUrl = externalVideoUrl.trim();
      let isLocal = false;

      if (videoMode === 'upload') {
        if (!videoFile) {
          setErrorMsg('Please select a video file (.mp4, .webm, .mov).');
          setUploadingVideo(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', videoFile);
        const upResp = await fetch('/api/upload/video', {
          method: 'POST',
          headers: { Authorization: `Bearer ${ownerToken}` },
          body: formData
        });
        const upData = (await upResp.json()) as { videoUrl?: string; error?: string };
        if (!upResp.ok || !upData.videoUrl) {
          setErrorMsg(upData.error || 'Video upload failed.');
          setUploadingVideo(false);
          return;
        }
        finalUrl = upData.videoUrl;
        isLocal = true;
      }

      if (!finalUrl) {
        setErrorMsg('Please provide a video URL or upload a file.');
        setUploadingVideo(false);
        return;
      }

      const id = `rec_${Date.now()}`;
      try {
        await setDoc(doc(db, 'recordedVideos', id), {
          id,
          title: videoTitle.trim(),
          subject: videoSubject.trim(),
          instructor: videoInstructor.trim(),
          duration: videoDuration.trim() || '45:00',
          videoUrl: finalUrl,
          isLocalUpload: isLocal,
          requiredTier: videoTier,
          description: videoDesc.trim() || 'Recorded cohort lecture session.',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `recordedVideos/${id}`);
      }

      setNotice(`Published recorded lecture "${videoTitle.trim()}".`);
      setVideoFile(null);
      setExternalVideoUrl('');
      setVideoTitle('');
      setVideoDesc('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not publish video.');
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleDeleteVideo(id: string) {
    clearAlerts();
    try {
      await deleteDoc(doc(db, 'recordedVideos', id));
      setNotice('Recorded lecture removed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `recordedVideos/${id}`);
    }
  }

  async function handleLiveClassCreate(e: FormEvent) {
    e.preventDefault();
    clearAlerts();
    const id = `live_${Date.now()}`;
    try {
      await setDoc(doc(db, 'liveClasses', id), {
        id,
        title: liveTitle.trim(),
        subject: liveSubject.trim(),
        instructor: liveInstructor.trim(),
        batchTime: liveBatchTime.trim(),
        durationMinutes: Number(liveDuration) || 90,
        status: liveStatus,
        streamUrl: liveStreamUrl.trim(),
        requiredTier: liveTier,
        seatsRemaining: Number(liveSeats) || 20,
        topicNotes: liveNotes.trim() || 'Interactive live cohort session.',
        updatedAt: serverTimestamp()
      });
      setNotice(`Scheduled live class "${liveTitle.trim()}".`);
      setLiveTitle('');
      setLiveStreamUrl('');
      setLiveNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `liveClasses/${id}`);
    }
  }

  async function handleLiveStatusUpdate(id: string, status: 'live' | 'upcoming' | 'ended') {
    clearAlerts();
    try {
      await updateDoc(doc(db, 'liveClasses', id), {
        status,
        updatedAt: serverTimestamp()
      });
      setNotice(`Live class status updated to ${status.toUpperCase()}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `liveClasses/${id}`);
    }
  }

  async function handleDeleteLiveClass(id: string) {
    clearAlerts();
    try {
      await deleteDoc(doc(db, 'liveClasses', id));
      setNotice('Live class removed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `liveClasses/${id}`);
    }
  }

  async function handleCreateStudentByOwner(e: FormEvent) {
    e.preventDefault();
    clearAlerts();
    if (!ownerToken) return;
    try {
      const resp = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`
        },
        body: JSON.stringify({
          fullName: newStudentName,
          email: newStudentEmail,
          phone: newStudentPhone,
          plan: newStudentPlan,
          password: newStudentPassword
        })
      });
      const data = (await resp.json()) as { student?: StudentProfile; error?: string };
      if (!resp.ok || !data.student) {
        setErrorMsg(data.error || 'Could not issue Login ID.');
      } else {
        setStudents((prev) => [data.student!, ...prev]);
        setNotice(`Issued active Login ID ${data.student.loginId} for ${data.student.fullName}.`);
        setNewStudentName('');
        setNewStudentEmail('');
        setNewStudentPhone('');
      }
    } catch {
      setErrorMsg('Network error creating student.');
    }
  }

  async function handleUpdateStudent(
    loginId: string,
    patch: { status?: 'active' | 'pending' | 'suspended'; plan?: PlanTier }
  ) {
    if (!ownerToken) return;
    try {
      const resp = await fetch(`/api/admin/students/${encodeURIComponent(loginId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`
        },
        body: JSON.stringify(patch)
      });
      const data = (await resp.json()) as { student?: StudentProfile };
      if (resp.ok && data.student) {
        setStudents((prev) => prev.map((s) => (s.loginId === loginId ? data.student! : s)));
        setNotice(`Updated student ${loginId}.`);
      }
    } catch {
      // ignore
    }
  }

  async function handleDeleteStudent(loginId: string) {
    if (!ownerToken) return;
    try {
      const resp = await fetch(`/api/admin/students/${encodeURIComponent(loginId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      if (resp.ok) {
        setStudents((prev) => prev.filter((s) => s.loginId !== loginId));
        setNotice(`Removed student ${loginId}.`);
      }
    } catch {
      // ignore
    }
  }

  async function handleToggleAutoApprove(nextVal: boolean) {
    if (!ownerToken) return;
    try {
      const resp = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`
        },
        body: JSON.stringify({ autoApproveStudents: nextVal })
      });
      if (resp.ok) {
        setAutoApprove(nextVal);
        setNotice(
          nextVal
            ? 'New student registrations are now auto-approved.'
            : 'New student registrations now require your manual approval.'
        );
      }
    } catch {
      // ignore
    }
  }

  async function handleSavePlan(planId: string) {
    clearAlerts();
    const p = planEdits[planId];
    if (!p) return;
    try {
      await updateDoc(doc(db, 'pricingPlans', planId), {
        name: p.name,
        kicker: p.kicker,
        monthlyInr: Number(p.monthlyInr),
        quarterlyInr: Number(p.quarterlyInr),
        annualInr: Number(p.annualInr),
        monthlyUsd: Number(p.monthlyUsd),
        quarterlyUsd: Number(p.quarterlyUsd),
        annualUsd: Number(p.annualUsd),
        description: p.description,
        updatedAt: serverTimestamp()
      });
      setNotice(`Saved pricing updates for ${p.name}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pricingPlans/${planId}`);
    }
  }

  async function handleCreateCourse(e: FormEvent) {
    e.preventDefault();
    clearAlerts();
    const id = `course_${Date.now()}`;
    const parsedHighlights = courseHighlights
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (parsedHighlights.length === 0) {
      parsedHighlights.push('Live classes, recorded videos & study PDFs');
    }

    const monthlyUsd = Math.max(1, Math.round(Number(courseMonthlyInr) / 80));
    const fullCourseUsd = Math.max(1, Math.round(Number(courseFullInr) / 80));

    try {
      await setDoc(doc(db, 'courses', id), {
        id,
        title: courseTitle.trim(),
        category: courseCategory.trim() || 'Class 10th',
        kicker: courseKicker.trim() || 'Live Classes + PDFs',
        monthlyInr: Number(courseMonthlyInr) || 0,
        fullCourseInr: Number(courseFullInr) || 0,
        monthlyUsd,
        fullCourseUsd,
        durationLabel: courseDuration.trim() || 'Full Course',
        scheduleLabel: courseSchedule.trim() || 'Mon–Fri',
        requiredTier: courseTier,
        highlights: parsedHighlights,
        order: courses.length + 1,
        updatedAt: serverTimestamp()
      });
      setNotice(`Added course "${courseTitle.trim()}" with pricing.`);
      setCourseTitle('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${id}`);
    }
  }

  async function handleSaveCourse(courseId: string) {
    clearAlerts();
    const c = courseEdits[courseId];
    if (!c) return;
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        title: c.title,
        category: c.category,
        kicker: c.kicker,
        monthlyInr: Number(c.monthlyInr),
        fullCourseInr: Number(c.fullCourseInr),
        monthlyUsd: Math.max(1, Math.round(Number(c.monthlyInr) / 80)),
        fullCourseUsd: Math.max(1, Math.round(Number(c.fullCourseInr) / 80)),
        durationLabel: c.durationLabel,
        scheduleLabel: c.scheduleLabel,
        requiredTier: c.requiredTier,
        updatedAt: serverTimestamp()
      });
      setNotice(`Updated fee & schedule for "${c.title}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
    }
  }

  async function handleDeleteCourse(courseId: string) {
    clearAlerts();
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      setNotice('Course removed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
    }
  }

  return (
    <section id="owner-console" className="py-16 border-t-2 border-blue-700 bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Owner-Only Admin Console · {OWNER_EMAIL}</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Manage Live Classes, Recorded Videos, PDFs &amp; Student Login IDs
            </h2>
          </div>

          <button
            type="button"
            onClick={() => signOut(auth)}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg inline-flex items-center gap-2 self-start cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Owner</span>
          </button>
        </div>

        {/* Console Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-800 rounded-lg mb-6 w-fit">
          {[
            { id: 'courses', label: 'Courses & Fees', icon: BookOpen },
            { id: 'pdfs', label: 'PDF Upload', icon: FileUp },
            { id: 'videos', label: 'Recorded Videos', icon: Video },
            { id: 'live', label: 'Live Classes', icon: Radio },
            { id: 'students', label: 'Student Login IDs', icon: Users },
            { id: 'pricing', label: 'Cohort Plans', icon: IndianRupee }
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  clearAlerts();
                  setActiveTab(item.id as typeof activeTab);
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {notice && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-sm">
            {notice}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/60 border border-red-700 text-red-200 text-sm">
            {errorMsg}
          </div>
        )}

        {/* TAB 1: PDF UPLOAD */}
        {activeTab === 'pdfs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handlePdfSubmit}
              className="lg:col-span-5 p-6 rounded-xl bg-slate-800/70 border border-slate-700 space-y-4"
            >
              <h3 className="text-base font-semibold text-white">Upload New Study PDF</h3>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PDF File (.pdf)</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Material Title</label>
                <input
                  type="text"
                  required
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="e.g. Linear Algebra Lecture 05 Notes"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={pdfSubject}
                    onChange={(e) => setPdfSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Chapter / Module</label>
                  <input
                    type="text"
                    value={pdfChapter}
                    onChange={(e) => setPdfChapter(e.target.value)}
                    placeholder="Module 02"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Required Access Tier</label>
                <select
                  value={pdfTier}
                  onChange={(e) => setPdfTier(e.target.value as PlanTier)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="free">Free Demo (All Visitors)</option>
                  <option value="foundation">Foundation &amp; Above</option>
                  <option value="pro">Cohort Pro &amp; Above</option>
                  <option value="scholar">Scholar 1:1 Only</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={uploadingPdf}
                className="w-full py-2.5 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {uploadingPdf ? 'Uploading PDF...' : 'Upload & Publish PDF'}
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-base font-semibold text-white">
                Published PDFs ({studyPdfs.length})
              </h3>
              {studyPdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{pdf.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {pdf.subject} · {pdf.chapter} · {formatTierLabel(pdf.requiredTier)} · {pdf.fileSizeLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePdf(pdf.id)}
                    className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
                    aria-label={`Delete ${pdf.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: RECORDED VIDEOS */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleVideoSubmit}
              className="lg:col-span-5 p-6 rounded-xl bg-slate-800/70 border border-slate-700 space-y-4"
            >
              <h3 className="text-base font-semibold text-white">Add Recorded Class Video</h3>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-lg">
                <button
                  type="button"
                  onClick={() => setVideoMode('upload')}
                  className={`py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    videoMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Upload Video File
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode('url')}
                  className={`py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    videoMode === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Paste Video / YouTube Link
                </button>
              </div>

              {videoMode === 'upload' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Video File (.mp4, .webm, .mov)
                  </label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Video Stream or YouTube URL
                  </label>
                  <input
                    type="url"
                    value={externalVideoUrl}
                    onChange={(e) => setExternalVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or MP4 URL"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lecture Title</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Lecture 05: Segment Trees & Lazy Propagation"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={videoSubject}
                    onChange={(e) => setVideoSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    placeholder="52:10"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Instructor</label>
                  <input
                    type="text"
                    required
                    value={videoInstructor}
                    onChange={(e) => setVideoInstructor(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Access Tier</label>
                  <select
                    value={videoTier}
                    onChange={(e) => setVideoTier(e.target.value as PlanTier)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="free">Free Demo</option>
                    <option value="foundation">Foundation</option>
                    <option value="pro">Cohort Pro</option>
                    <option value="scholar">Scholar 1:1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Summary Notes</label>
                <textarea
                  rows={2}
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  placeholder="Topics covered in this recorded lecture..."
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <button
                type="submit"
                disabled={uploadingVideo}
                className="w-full py-2.5 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {uploadingVideo ? 'Publishing Video...' : 'Publish Recorded Video'}
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-base font-semibold text-white">
                Recorded Lectures ({recordedVideos.length})
              </h3>
              {recordedVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{vid.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {vid.subject} · {vid.instructor} · {vid.duration} · {formatTierLabel(vid.requiredTier)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteVideo(vid.id)}
                    className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
                    aria-label={`Delete ${vid.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE CLASSES */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleLiveClassCreate}
              className="lg:col-span-5 p-6 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3.5"
            >
              <h3 className="text-base font-semibold text-white">Start or Schedule Live Class</h3>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Class Title</label>
                <input
                  type="text"
                  required
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  placeholder="e.g. Live Doubt Clinic: Probability & Bayes"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={liveSubject}
                    onChange={(e) => setLiveSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Instructor</label>
                  <input
                    type="text"
                    required
                    value={liveInstructor}
                    onChange={(e) => setLiveInstructor(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Schedule Time</label>
                  <input
                    type="text"
                    required
                    value={liveBatchTime}
                    onChange={(e) => setLiveBatchTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={liveStatus}
                    onChange={(e) => setLiveStatus(e.target.value as 'live' | 'upcoming' | 'ended')}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="live">LIVE NOW</option>
                    <option value="upcoming">UPCOMING</option>
                    <option value="ended">ENDED</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tier</label>
                  <select
                    value={liveTier}
                    onChange={(e) => setLiveTier(e.target.value as PlanTier)}
                    className="w-full px-2.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="free">Free Demo</option>
                    <option value="foundation">Foundation</option>
                    <option value="pro">Cohort Pro</option>
                    <option value="scholar">Scholar 1:1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration (m)</label>
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={liveDuration}
                    onChange={(e) => setLiveDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Seats</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={liveSeats}
                    onChange={(e) => setLiveSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Live Stream / YouTube Live URL (Optional)
                </label>
                <input
                  type="url"
                  value={liveStreamUrl}
                  onChange={(e) => setLiveStreamUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Topic Notes</label>
                <textarea
                  rows={2}
                  value={liveNotes}
                  onChange={(e) => setLiveNotes(e.target.value)}
                  placeholder="What will be taught in this live session..."
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Live Class</span>
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-base font-semibold text-white">
                Scheduled &amp; Active Live Classes ({liveClasses.length})
              </h3>
              {liveClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{cls.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {cls.subject} · {cls.batchTime} · {formatTierLabel(cls.requiredTier)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(['live', 'upcoming', 'ended'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleLiveStatusUpdate(cls.id, st)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer uppercase ${
                          cls.status === st
                            ? st === 'live'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleDeleteLiveClass(cls.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                      aria-label={`Delete ${cls.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: STUDENT LOGIN IDS & ACCESS CONTROL */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleCreateStudentByOwner}
                className="lg:col-span-5 p-5 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3"
              >
                <h3 className="text-base font-semibold text-white">Issue New Student Login ID</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Student Name"
                    className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <input
                    type="email"
                    required
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="Email Address"
                    className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="tel"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="Phone"
                    className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                  <select
                    value={newStudentPlan}
                    onChange={(e) => setNewStudentPlan(e.target.value as PlanTier)}
                    className="px-2.5 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="foundation">Foundation</option>
                    <option value="pro">Cohort Pro</option>
                    <option value="scholar">Scholar 1:1</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="Temp Password"
                    className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                >
                  Create Approved Student ID
                </button>
              </form>

              <div className="lg:col-span-7 p-5 rounded-xl bg-slate-800/50 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Registration Approval Mode</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    When disabled, newly registered students must wait for your approval before accessing paid live classes, videos, and PDFs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAutoApprove(!autoApprove)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                    autoApprove ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {autoApprove ? 'Auto-Approve: ON' : 'Manual Approval: ON'}
                </button>
              </div>
            </div>

            <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300">
                      <th className="py-3 px-4">Login ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Assigned Plan</th>
                      <th className="py-3 px-4">Access Status</th>
                      <th className="py-3 px-4 text-right">Owner Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/80">
                    {loadingStudents ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                          Loading student accounts...
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                          No students registered yet. Issue a Login ID above or wait for new registrations.
                        </td>
                      </tr>
                    ) : (
                      students.map((st) => (
                        <tr key={st.loginId}>
                          <td className="py-3 px-4 font-mono font-semibold text-white">
                            {st.loginId}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{st.fullName}</div>
                            <div className="text-xs text-slate-400">
                              {st.email} {st.phone ? `· ${st.phone}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={st.plan}
                              onChange={(e) =>
                                handleUpdateStudent(st.loginId, { plan: e.target.value as PlanTier })
                              }
                              className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                            >
                              <option value="free">Free Demo</option>
                              <option value="foundation">Foundation</option>
                              <option value="pro">Cohort Pro</option>
                              <option value="scholar">Scholar 1:1</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold">
                            <span
                              className={
                                st.status === 'active'
                                  ? 'text-emerald-400'
                                  : st.status === 'pending'
                                    ? 'text-amber-300'
                                    : 'text-red-400'
                              }
                            >
                              {st.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {st.status !== 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStudent(st.loginId, { status: 'active' })}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {st.status !== 'suspended' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateStudent(st.loginId, { status: 'suspended' })
                                  }
                                  className="px-2.5 py-1 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(st.loginId)}
                                className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer"
                                aria-label={`Remove ${st.loginId}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PRICING EDITOR */}
        {activeTab === 'pricing' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...plans]
              .sort((a, b) => a.order - b.order)
              .map((plan) => {
                const draft = planEdits[plan.id] || plan;
                return (
                  <div
                    key={plan.id}
                    className="p-5 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3"
                  >
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) =>
                        setPlanEdits((prev) => ({
                          ...prev,
                          [plan.id]: { ...draft, name: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                      type="text"
                      value={draft.kicker}
                      onChange={(e) =>
                        setPlanEdits((prev) => ({
                          ...prev,
                          [plan.id]: { ...draft, kicker: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Mo (₹)</label>
                        <input
                          type="number"
                          value={draft.monthlyInr}
                          onChange={(e) =>
                            setPlanEdits((prev) => ({
                              ...prev,
                              [plan.id]: { ...draft, monthlyInr: Number(e.target.value) }
                            }))
                          }
                          className="w-full px-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Qtr (₹)</label>
                        <input
                          type="number"
                          value={draft.quarterlyInr}
                          onChange={(e) =>
                            setPlanEdits((prev) => ({
                              ...prev,
                              [plan.id]: { ...draft, quarterlyInr: Number(e.target.value) }
                            }))
                          }
                          className="w-full px-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Yr (₹)</label>
                        <input
                          type="number"
                          value={draft.annualInr}
                          onChange={(e) =>
                            setPlanEdits((prev) => ({
                              ...prev,
                              [plan.id]: { ...draft, annualInr: Number(e.target.value) }
                            }))
                          }
                          className="w-full px-2 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(e) =>
                        setPlanEdits((prev) => ({
                          ...prev,
                          [plan.id]: { ...draft, description: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePlan(plan.id)}
                      className="w-full py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                    >
                      Save Plan Changes
                    </button>
                  </div>
                );
              })}
          </div>
        )}
        {/* TAB 6: COURSES & FEES (10th, 12th, Computer Basic) */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleCreateCourse}
              className="lg:col-span-5 p-6 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3.5"
            >
              <h3 className="text-base font-semibold text-white">Add New Course &amp; Price</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={courseCategory}
                    onChange={(e) => setCourseCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Class 10th">Class 10th</option>
                    <option value="Class 12th">Class 12th</option>
                    <option value="Computer Basic">Computer Basic</option>
                    <option value="Special Batch">Special Batch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Access Tier</label>
                  <select
                    value={courseTier}
                    onChange={(e) => setCourseTier(e.target.value as PlanTier)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="free">Free Demo</option>
                    <option value="foundation">Foundation</option>
                    <option value="pro">Cohort Pro</option>
                    <option value="scholar">Scholar 1:1</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Class 10th Science & Maths Live Batch"
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subtitle / Kicker</label>
                <input
                  type="text"
                  required
                  value={courseKicker}
                  onChange={(e) => setCourseKicker(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={courseMonthlyInr}
                    onChange={(e) => setCourseMonthlyInr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Course Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={courseFullInr}
                    onChange={(e) => setCourseFullInr(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Batch Timing</label>
                  <input
                    type="text"
                    required
                    value={courseSchedule}
                    onChange={(e) => setCourseSchedule(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Syllabus Highlights (one per line)
                </label>
                <textarea
                  rows={3}
                  value={courseHighlights}
                  onChange={(e) => setCourseHighlights(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Course &amp; Price</span>
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-base font-semibold text-white">
                Active Courses ({courses.length})
              </h3>
              {[...courses]
                .sort((a, b) => a.order - b.order)
                .map((course) => {
                  const draft = courseEdits[course.id] || course;
                  return (
                    <div
                      key={course.id}
                      className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) =>
                              setCourseEdits((prev) => ({
                                ...prev,
                                [course.id]: { ...draft, title: e.target.value }
                              }))
                            }
                            className="px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded text-white"
                          />
                          <input
                            type="text"
                            value={draft.scheduleLabel}
                            onChange={(e) =>
                              setCourseEdits((prev) => ({
                                ...prev,
                                [course.id]: { ...draft, scheduleLabel: e.target.value }
                              }))
                            }
                            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer shrink-0"
                          aria-label={`Delete ${course.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Monthly (₹)</label>
                          <input
                            type="number"
                            value={draft.monthlyInr}
                            onChange={(e) =>
                              setCourseEdits((prev) => ({
                                ...prev,
                                [course.id]: { ...draft, monthlyInr: Number(e.target.value) }
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Full Course (₹)</label>
                          <input
                            type="number"
                            value={draft.fullCourseInr}
                            onChange={(e) =>
                              setCourseEdits((prev) => ({
                                ...prev,
                                [course.id]: { ...draft, fullCourseInr: Number(e.target.value) }
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveCourse(course.id)}
                          className="py-1.5 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                        >
                          Save Fee
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
