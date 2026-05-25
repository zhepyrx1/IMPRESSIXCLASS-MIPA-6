import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  Activity,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  GalleryHorizontalEnd,
  GraduationCap,
  ImagePlus,
  Download,
  LayoutDashboard,
  LogOut,
  QrCode,
  ScanLine,
  Sparkles,
  UsersRound,
  XCircle,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  createAttendanceRecord,
  createActivity,
  deleteAttendanceRecord,
  exportAttendanceRecords,
  getActivities,
  getCurrentProfile,
  getStudentAttendanceRecords,
  getStudentTodayAttendance,
  getStudents,
  getTeacherAttendanceRecords,
  getTodayAttendanceRecords,
  normalizeAttendanceRecord,
  toLoggedUser,
  updateActivity,
  uploadStudentProfilePhoto,
} from './lib/attendanceService';
import {
  classProfile,
  leaders,
  leadershipGroups,
} from './data/classProfile';

const today = new Date().toISOString().slice(0, 10);
const qrLifetimeSeconds = 120;
const qrExpiryToleranceMs = 30 * 1000;

function parseQrPayload(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed.type !== 'attendance' || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isExpired(expiresAt) {
  const now = Date.now();
  const expiredTime = new Date(expiresAt).getTime();
  return Number.isNaN(expiredTime) || now > expiredTime + qrExpiryToleranceMs;
}

async function getLoggedUserFromProfile(userId) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, students(*)')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile || !profile.role) {
    throw new Error('Profil pengguna tidak ditemukan atau role belum diatur.');
  }

  if (profile.role !== 'teacher' && profile.role !== 'student') {
    throw new Error('Role pengguna tidak valid.');
  }

  if (profile.role === 'student' && !profile.student_id) {
    throw new Error('Data siswa belum terhubung dengan akun ini.');
  }

  if (profile.role === 'student' && !profile.students) {
    throw new Error('Data siswa tidak ditemukan.');
  }

  return toLoggedUser(profile);
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-primary-900">{value}</p>
    </div>
  );
}

function Avatar({ src, name, className = 'h-14 w-14' }) {
  return (
    <img
      src={src || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}`}
      alt={name}
      className={`${className} rounded-2xl border border-primary-100 bg-primary-50 object-cover`}
    />
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-sm font-black uppercase tracking-[0.22em] text-primary-700">{eyebrow}</p>
        <h1 className="text-3xl font-black text-primary-900 sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function LandingPage() {
  const [galleryStudents, setGalleryStudents] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState('');
  const [landingActivities, setLandingActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchGalleryStudents() {
      setGalleryLoading(true);
      setGalleryError('');
      try {
        const data = await getStudents();
        if (isMounted) setGalleryStudents(data);
      } catch (err) {
        console.error('Gagal mengambil galeri siswa:', err);
        if (isMounted) setGalleryError(err.message || 'Gagal mengambil galeri siswa.');
      } finally {
        if (isMounted) setGalleryLoading(false);
      }
    }

    fetchGalleryStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchLandingActivities() {
      setActivitiesLoading(true);
      setActivitiesError('');

      try {
        const data = await getActivities();
        if (isMounted) setLandingActivities(data.slice(0, 6));
      } catch (err) {
        console.error('Gagal mengambil kegiatan landing:', err);
        if (isMounted) setActivitiesError(err.message || 'Gagal mengambil kegiatan.');
      } finally {
        if (isMounted) setActivitiesLoading(false);
      }
    }

    fetchLandingActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-mint bg-grid bg-[length:28px_28px]">
      <header className="section-shell flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-800 text-neon">
            <GraduationCap />
          </div>
          <div>
            <p className="font-black text-primary-900">IMPRESSIX CLASS</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-700">MIPA 6</p>
          </div>
        </Link>
        <Link to="/login" className="rounded-full bg-primary-900 px-5 py-2.5 font-bold text-white shadow-soft">
          Login
        </Link>
      </header>

      <section className="section-shell pb-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary-900 bg-grid-dark bg-[length:34px_34px] px-6 py-14 text-white shadow-soft sm:px-10 lg:px-14 lg:py-20">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-lime-100">
              <Sparkles size={18} /> Profil kelas digital
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{classProfile.className}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-teal-50">{classProfile.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="btn-primary">
                Login / Masuk
              </Link>
              <a href="#galeri-siswa" className="btn-secondary">
                Lihat Galeri Siswa
              </a>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['Sekolah', classProfile.school],
              ['Jumlah Siswa', `${galleryStudents.length} siswa`],
              ['Slogan', classProfile.slogan],
            ].map(([label, value]) => (
              <div key={label} className="glass rounded-3xl p-5">
                <p className="text-sm font-bold text-lime-100">{label}</p>
                <p className="mt-2 text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-10">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Pimpinan Sekolah</p>
          <h2 className="mt-2 text-3xl font-black text-primary-900">Kepala sekolah dan wali kelas</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {leadershipGroups.school.map((person) => (
            <ProfileCard key={person.id} person={person} />
          ))}
        </div>
      </section>

      <section className="section-shell py-10">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Pengurus Kelas</p>
          <h2 className="mt-2 text-3xl font-black text-primary-900">Ketua dan wakil ketua kelas</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {leadershipGroups.class.map((person) => (
            <ProfileCard key={person.id} person={person} />
          ))}
        </div>
      </section>

      <section className="section-shell py-10">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Galeri Kegiatan</p>
          <h2 className="mt-2 text-3xl font-black text-primary-900">Kegiatan kelas terbaru</h2>
        </div>
        {activitiesLoading && <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Memuat kegiatan...</p>}
        {activitiesError && <p className="mb-5 rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{activitiesError}</p>}
        {!activitiesLoading && !activitiesError && !landingActivities.length && (
          <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada kegiatan.</p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {landingActivities.map((activity) => (
            <article key={activity.id} className="card overflow-hidden">
              {activity.image_url ? (
                <img src={activity.image_url} alt={activity.title} className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 w-full items-center justify-center bg-primary-50 font-black text-primary-700">Foto Kegiatan</div>
              )}
              <div className="p-5">
                <p className="text-sm font-black text-primary-700">{activity.date}</p>
                <h3 className="mt-1 text-xl font-black text-primary-900">{activity.title}</h3>
                <p className="mt-2 line-clamp-3 leading-7 text-slate-600">{activity.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="galeri-siswa" className="section-shell py-10 pb-20">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Galeri Siswa</p>
          <h2 className="mt-2 text-3xl font-black text-primary-900">{galleryStudents.length} profil siswa MIPA 6</h2>
        </div>
        {galleryLoading && <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Memuat galeri siswa...</p>}
        {galleryError && <p className="mb-5 rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{galleryError}</p>}
        {!galleryLoading && !galleryError && !galleryStudents.length && (
          <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada data siswa.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {galleryStudents.map((student) => (
            <article key={student.id} className="card overflow-hidden p-4">
              <Avatar src={student.photo_url} name={student.name} className="aspect-square h-auto w-full rounded-[1.5rem]" />
              <div className="pt-4">
                <p className="text-sm font-black text-primary-700">No. Absen {student.no_absen}</p>
                <h3 className="mt-1 text-lg font-black text-primary-900">{student.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{student.description || `${student.role_in_class || 'Anggota kelas'} MIPA 6.`}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProfileCard({ person }) {
  return (
    <article className="card grid gap-5 p-5 sm:grid-cols-[150px_1fr] sm:items-center">
      <img src={person.photo_url} alt={person.name} className="aspect-square w-full max-w-[180px] rounded-[1.5rem] bg-primary-50 object-cover shadow-soft" />
      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-primary-700">{person.label}</p>
        <h3 className="mt-2 text-2xl font-black text-primary-900">{person.name}</h3>
        <p className="mt-3 leading-7 text-slate-600">{person.description}</p>
      </div>
    </article>
  );
}

function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() && !password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }

    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }

    if (!password.trim()) {
      setError('Password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');
    localStorage.removeItem('impressix-user');
    setUser(null);

    try {
      if (!supabase) {
        throw new Error('Login belum dapat digunakan.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error('Email atau password salah.');
      }

      const loggedUser = await getLoggedUserFromProfile(authData.user.id);

      localStorage.setItem('impressix-user', JSON.stringify(loggedUser));
      setUser(loggedUser);

      if (loggedUser.role === 'teacher') {
        navigate('/guru');
      }

      if (loggedUser.role === 'student') {
        navigate('/siswa');
      }
    } catch (err) {
      if (supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('impressix-user');
      setUser(null);
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-mint bg-grid bg-[length:28px_28px] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-soft lg:grid-cols-[.95fr_1.05fr]">
        <section className="bg-primary-900 bg-grid-dark bg-[length:30px_30px] p-8 text-white sm:p-12">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon text-primary-900">
              <GraduationCap />
            </div>
            <div>
              <p className="text-xl font-black">IMPRESSIX CLASS</p>
              <p className="text-sm font-bold text-lime-100">MIPA 6</p>
            </div>
          </Link>
          <div className="mt-20 max-w-md">
            <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-lime-100">Logo Sekolah</p>
            <h1 className="text-4xl font-black leading-tight">XI.1 Digital Class</h1>
            <p className="mt-5 text-lg leading-8 text-teal-50">Sistem Presensi dan Informasi Kelas.</p>
          </div>
        </section>
        <section className="flex items-center p-8 sm:p-12">
          <form onSubmit={handleSubmit} className="w-full">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-primary-700">Login Resmi</p>
            <h2 className="mt-2 text-3xl font-black text-primary-900">Masuk ke dashboard</h2>
            <div className="mt-8 grid gap-4">
              <label className="grid gap-2 font-bold text-primary-900">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 outline-none focus:border-primary-500"
                  placeholder="nama@impressix.sch.id"
                />
              </label>
              <label className="grid gap-2 font-bold text-primary-900">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 outline-none focus:border-primary-500"
                  placeholder="Masukkan password"
                />
              </label>
            </div>
            {error && <p className="mt-5 rounded-2xl bg-rose-100 p-4 text-sm font-bold text-rose-800">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="mt-7 w-full rounded-full bg-primary-900 px-6 py-3.5 font-black text-white shadow-soft transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Shell({ role, onLogout, children }) {
  const location = useLocation();
  const teacherItems = [
    ['Beranda', '/guru', LayoutDashboard],
    ['Profil Kelas', '/guru/profil-kelas', BookOpen],
    ['Data Siswa', '/guru/data-siswa', UsersRound],
    ['QR Presensi', '/guru/qr-presensi', QrCode],
    ['Verifikasi Izin/Sakit', '/guru/verifikasi', FileCheck2],
    ['Kegiatan', '/guru/kegiatan', Camera],
    ['Rekap Presensi', '/guru/rekap', ClipboardCheck],
  ];
  const studentItems = [
    ['Beranda', '/siswa', LayoutDashboard],
    ['Profil Kelas', '/siswa/profil-kelas', BookOpen],
    ['Scan QR Presensi', '/siswa/scan', ScanLine],
    ['Form Izin/Sakit', '/siswa/izin', FileCheck2],
    ['Galeri Kegiatan', '/siswa/kegiatan', GalleryHorizontalEnd],
    ['Riwayat Presensi', '/siswa/riwayat', Clock3],
  ];
  const items = role === 'teacher' ? teacherItems : studentItems;

  return (
    <div className="min-h-screen bg-mint bg-grid bg-[length:28px_28px] p-4">
      <div className="dashboard-grid mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[290px_1fr]">
        <aside className="rounded-[2rem] bg-primary-900 p-5 text-white shadow-soft lg:sticky lg:top-4 lg:h-[calc(100vh-32px)]">
          <Link to="/" className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon text-primary-900">
              <GraduationCap />
            </div>
            <div>
              <p className="font-black">IMPRESSIX CLASS</p>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-100">MIPA 6</p>
            </div>
          </Link>
          <nav className="grid gap-2">
            {items.map(([label, href, Icon]) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/guru' || href === '/siswa'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${
                    isActive || location.pathname === href ? 'bg-neon text-primary-900' : 'text-teal-50 hover:bg-white/10'
                  }`
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </nav>
          <button onClick={onLogout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold text-white hover:bg-white/20">
            <LogOut size={18} /> Keluar
          </button>
        </aside>
        <main className="rounded-[2rem] bg-white/75 p-5 shadow-soft backdrop-blur sm:p-8">{children}</main>
      </div>
    </div>
  );
}

function TeacherDashboard({ user }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  async function fetchTodayRecords() {
    setAttendanceError('');
    try {
      const data = await getTodayAttendanceRecords(today);
      setTodayRecords(data);
    } catch (err) {
      console.error('Gagal mengambil presensi hari ini:', err);
      setAttendanceError(err.message || 'Gagal mengambil presensi hari ini.');
    } finally {
      setAttendanceLoading(false);
    }
  }

  useEffect(() => {
    async function fetchPendingRequests() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('absence_requests')
        .select(`
          *,
          students (
            id,
            name,
            no_absen,
            class_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Gagal mengambil ringkasan pengajuan:', error);
        return;
      }

      setPendingRequests(data || []);
    }

    fetchPendingRequests();
    fetchTodayRecords();
    getStudents().then((data) => setStudentCount(data.length)).catch((err) => console.error('Gagal mengambil jumlah siswa:', err));
    getActivities().then((data) => setActivityCount(data.length)).catch((err) => console.error('Gagal mengambil jumlah kegiatan:', err));

    if (!supabase) return undefined;
    const channel = supabase
      .channel('teacher-dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, fetchTodayRecords)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard Guru"
        title={`Selamat datang, ${user.name}`}
        description="Pantau kehadiran, pengajuan izin, data siswa, dan agenda kelas dari satu layar."
      />
      <div className="mb-6 rounded-3xl border border-primary-100 bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-primary-700">Akun Guru</p>
        <h2 className="mt-2 text-2xl font-black text-primary-900">{user.name}</h2>
        <p className="mt-1 font-semibold text-slate-500">{user.email}</p>
        <p className="mt-1 font-semibold text-slate-500">Role: {user.role}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatPill icon={UsersRound} label="Jumlah Siswa" value={studentCount} />
        <StatPill icon={CheckCircle2} label="Hadir Hari Ini" value={todayRecords.length} />
        <StatPill icon={Clock3} label="Menunggu Verifikasi" value={pendingRequests.length} />
        <StatPill icon={Activity} label="Jumlah Kegiatan" value={activityCount} />
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-black text-primary-900">Presensi terbaru</h2>
          <div className="mt-5 grid gap-3">
            {attendanceError && <p className="rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{attendanceError}</p>}
            {attendanceLoading && <p className="rounded-2xl bg-primary-50 p-4 font-semibold text-primary-900">Memuat presensi hari ini...</p>}
            {!attendanceLoading && !attendanceError && !todayRecords.length && (
              <p className="rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada presensi hari ini.</p>
            )}
            {todayRecords.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-2xl bg-primary-50 p-4">
                <div>
                  <p className="font-black text-primary-900">{record.name}</p>
                  <p className="text-sm text-slate-500">No. {record.no_absen} - {record.time} - {record.method}</p>
                </div>
                <span className="rounded-full bg-lime-100 px-3 py-1 text-sm font-black text-primary-800">{record.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-black text-primary-900">Pengajuan masuk</h2>
          <div className="mt-5 grid gap-3">
            {pendingRequests.length ? pendingRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-primary-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-black text-primary-900">{request.students?.name || 'Siswa'}</p>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{absenceStatusLabels[request.status] || request.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{request.reason}</p>
              </div>
            )) : <p className="rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada pengajuan izin atau sakit yang perlu diverifikasi.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileClassPage() {
  return (
    <>
      <PageHeader eyebrow="Profil Kelas" title={classProfile.className} description={classProfile.slogan} />
      <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
        <div className="card p-6">
          <div className="grid gap-4">
            {[
              ['Nama Sekolah', classProfile.school],
              ['Nama Kelas', classProfile.className],
              ['Jumlah Siswa', `${classProfile.totalStudents} siswa`],
              ['Slogan Kelas', classProfile.slogan],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-primary-50 p-4">
                <p className="text-sm font-bold text-primary-700">{label}</p>
                <p className="mt-1 text-lg font-black text-primary-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {leaders.map((person) => (
            <div key={person.label} className="card p-5">
              <Avatar src={person.photo_url} name={person.name} className="h-20 w-20" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-primary-700">{person.label}</p>
              <h3 className="mt-1 text-xl font-black text-primary-900">{person.name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{person.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StudentsPage() {
  const [studentRows, setStudentRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchStudents() {
      setLoading(true);
      setError('');

      try {
        if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

        const data = await getStudents();
        if (isMounted) setStudentRows(data);
      } catch (err) {
        console.error('Gagal mengambil data siswa:', err);
        if (isMounted) setError(err.message || 'Gagal mengambil data siswa.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader eyebrow="Data Siswa" title="Data siswa MIPA 6" description="Data akun siswa dibuat dalam tampilan card modern agar mudah dipindai dan dikelola." />
      {loading && <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Memuat data siswa...</p>}
      {error && <p className="mb-5 rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{error}</p>}
      {!loading && !error && !studentRows.length && (
        <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada data siswa.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {studentRows.map((student) => (
          <div key={student.id} className="card flex gap-4 p-4">
            <Avatar src={student.photo_url} name={student.name} />
            <div className="min-w-0">
              <p className="text-sm font-black text-primary-700">No. {student.no_absen}</p>
              <h3 className="truncate text-lg font-black text-primary-900">{student.name}</h3>
              <p className="text-sm font-semibold text-slate-500">{student.class_name} - {student.role_in_class}</p>
              <p className="mt-1 truncate text-sm text-slate-500">{student.email}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function QrAttendancePage({ activeSession, setActiveSession, user }) {
  const [qrUrl, setQrUrl] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(qrLifetimeSeconds);
  const [qrError, setQrError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateQrSession() {
    setIsGenerating(true);
    setQrError('');

    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

      await supabase
        .from('attendance_sessions')
        .update({ is_active: false })
        .eq('is_active', true);

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + qrLifetimeSeconds * 1000).toISOString();

      const { data: session, error } = await supabase
        .from('attendance_sessions')
        .insert({
          token,
          class_name: 'MIPA 6',
          created_by: user.user_id,
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      setActiveSession(session);
    } catch (err) {
      console.error('Gagal membuat QR presensi:', err);
      setQrError(err.message || 'Gagal membuat QR presensi.');
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    generateQrSession();
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    QRCode.toDataURL(JSON.stringify({ type: 'attendance', token: activeSession.token }), {
      width: 320,
      margin: 2,
      color: { dark: '#083f3f', light: '#ffffff' },
    }).then(setQrUrl);
  }, [activeSession]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = activeSession ? Math.max(0, Math.ceil((new Date(activeSession.expires_at).getTime() - Date.now()) / 1000)) : qrLifetimeSeconds;
      setSecondsLeft(remaining);
      if (remaining <= 0 && activeSession && !isGenerating) generateQrSession();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession, isGenerating]);

  return (
    <>
      <PageHeader
        eyebrow="QR Presensi"
        title="QR dinamis aktif"
        description="Kode dibuat guru/admin dan berubah otomatis. Siswa yang login akan tercatat hadir setelah QR valid dipindai."
        action={<button onClick={generateQrSession} disabled={isGenerating} className="rounded-full bg-primary-900 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{isGenerating ? 'Membuat QR...' : 'Ganti QR Sekarang'}</button>}
      />
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="card p-6 text-center">
          <div className="mx-auto flex max-w-sm justify-center rounded-[2rem] bg-primary-50 p-5">
            {qrUrl && <img src={qrUrl} alt="QR Presensi Dinamis" className="w-full rounded-3xl" />}
          </div>
          <p className="mt-5 text-lg font-black text-primary-900">Berlaku {secondsLeft}s</p>
          <p className="text-sm text-slate-500">Token: {activeSession?.token?.slice(0, 8)}</p>
          {qrError && <p className="mt-4 rounded-2xl bg-rose-100 p-4 text-sm font-bold text-rose-800">{qrError}</p>}
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-black text-primary-900">Validasi sistem</h2>
          <div className="mt-5 grid gap-3">
            {['QR harus masih aktif', 'Siswa harus login', 'Satu siswa hanya bisa presensi satu kali per hari', 'Status Hadir hanya melalui scan QR', 'QR expired akan ditolak'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">
                <CheckCircle2 className="text-primary-700" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const absenceStatusLabels = {
  pending: 'Menunggu Verifikasi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

function VerificationPage({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchPendingAbsenceRequests() {
    setLoading(true);
    setError('');

    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data, error: fetchError } = await supabase
        .from('absence_requests')
        .select(`
          *,
          students (
            id,
            name,
            no_absen,
            class_name,
            email,
            role_in_class
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      console.error('Gagal mengambil pengajuan:', err);
      setError(err.message || 'Gagal mengambil pengajuan.');
    } finally {
      setLoading(false);
    }
  }

  async function updateRequestStatus(requestId, status) {
    setError('');

    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const updatePayload = {
        status,
        verified_at: new Date().toISOString(),
        verified_by: user.user_id,
      };

      const { error: updateError } = await supabase
        .from('absence_requests')
        .update(updatePayload)
        .eq('id', requestId);

      if (updateError) throw updateError;
      setRequests((current) => current.filter((request) => request.id !== requestId));
    } catch (err) {
      console.error(`Gagal ${status} pengajuan:`, err);
      setError(err.message || 'Gagal memperbarui pengajuan.');
    }
  }

  useEffect(() => {
    fetchPendingAbsenceRequests();
  }, []);

  return (
    <>
      <PageHeader eyebrow="Verifikasi" title="Pengajuan izin, sakit, dan tidak hadir" description="Guru dapat menyetujui atau menolak pengajuan siswa dari rumah." />
      <div className="grid gap-4">
        {error && <p className="rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{error}</p>}
        {loading && <p className="rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Memuat pengajuan...</p>}
        {!loading && !requests.length && !error && (
          <p className="rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Belum ada pengajuan izin atau sakit yang perlu diverifikasi.</p>
        )}
        {requests.map((request) => (
          <div key={request.id} className="card grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-black text-primary-900">{request.students?.name || 'Siswa'}</h3>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-black text-primary-800">No. {request.students?.no_absen || '-'}</span>
                <span className="rounded-full bg-lime-100 px-3 py-1 text-sm font-black text-primary-800">{request.type}</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">{absenceStatusLabels[request.status] || request.status}</span>
              </div>
              <p className="mt-2 text-slate-600">{request.date} - {request.reason}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateRequestStatus(request.id, 'approved')} className="rounded-full bg-primary-900 px-4 py-2 font-bold text-white">Setujui</button>
              <button onClick={() => updateRequestStatus(request.id, 'rejected')} className="rounded-full bg-rose-100 px-4 py-2 font-bold text-rose-700">Tolak</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ActivitiesPage({ user }) {
  const emptyForm = { title: '', date: today, description: '', file: null };
  const [activityRows, setActivityRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canManageActivities = user?.role === 'student';

  async function fetchActivities() {
    setError('');
    try {
      const data = await getActivities();
      setActivityRows(data);
    } catch (err) {
      console.error('Gagal mengambil kegiatan:', err);
      setError(err.message || 'Gagal mengambil kegiatan.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivities();

    if (!supabase) return undefined;
    const channel = supabase
      .channel('activities-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, fetchActivities)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function startEdit(activity) {
    setEditingId(activity.id);
    setForm({
      title: activity.title,
      date: activity.date,
      description: activity.description,
      file: null,
    });
    setMessage('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleActivitySubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await updateActivity(editingId, form);
        setMessage('Kegiatan berhasil diperbarui.');
      } else {
        await createActivity(form);
        setMessage('Kegiatan berhasil ditambahkan.');
      }
      resetForm();
      await fetchActivities();
    } catch (err) {
      console.error('Gagal menyimpan kegiatan:', err);
      setError(err.message || 'Gagal menyimpan kegiatan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Galeri Kegiatan" title="Dokumentasi kelas" description="Kegiatan kelas disajikan dalam card visual yang rapi dan ramah untuk siswa." />
      {canManageActivities && (
        <form onSubmit={handleActivitySubmit} className="card mb-6 p-6">
          <h2 className="text-2xl font-black text-primary-900">{editingId ? 'Edit kegiatan' : 'Tambah kegiatan'}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 font-bold text-primary-900">
              Judul kegiatan
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 outline-none focus:border-primary-500" />
            </label>
            <label className="grid gap-2 font-bold text-primary-900">
              Tanggal kegiatan
              <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 outline-none focus:border-primary-500" />
            </label>
            <label className="grid gap-2 font-bold text-primary-900 md:col-span-2">
              Deskripsi kegiatan
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 outline-none focus:border-primary-500" />
            </label>
            <label className="grid gap-2 font-bold text-primary-900 md:col-span-2">
              Upload foto kegiatan
              <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button disabled={saving} className="rounded-full bg-primary-900 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kegiatan'}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="rounded-full bg-primary-50 px-6 py-3 font-black text-primary-900">Batal</button>}
          </div>
        </form>
      )}
      {message && <p className="mb-5 rounded-2xl bg-lime-100 p-4 font-bold text-primary-900">{message}</p>}
      {error && <p className="mb-5 rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{error}</p>}
      {loading && <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Memuat kegiatan...</p>}
      {!loading && !error && !activityRows.length && <p className="mb-5 rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada kegiatan.</p>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {activityRows.map((activity) => (
          <article key={activity.id} className="card overflow-hidden">
            {activity.image_url ? (
              <img src={activity.image_url} alt={activity.title} className="h-52 w-full object-cover" />
            ) : (
              <div className="flex h-52 w-full items-center justify-center bg-primary-50 font-black text-primary-700">Foto Kegiatan</div>
            )}
            <div className="p-5">
              <p className="text-sm font-black text-primary-700">{activity.date}</p>
              <h3 className="mt-1 text-xl font-black text-primary-900">{activity.title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{activity.description}</p>
              {canManageActivities && (
                <button onClick={() => startEdit(activity)} className="mt-4 rounded-full bg-primary-900 px-5 py-2.5 font-black text-white">
                  Edit
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function RecapPage({ user, mode = 'teacher', title = 'Data kehadiran kelas' }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function fetchRecords() {
    setLoading(true);
    setError('');

    try {
      const data = mode === 'student'
        ? await getStudentAttendanceRecords(user.student.id)
        : await getTeacherAttendanceRecords();
      setRecords(data);
    } catch (err) {
      console.error('Gagal mengambil rekap presensi:', err);
      setError(err.message || 'Gagal mengambil rekap presensi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(recordId) {
    const ok = window.confirm('Hapus riwayat presensi ini?');
    if (!ok) return;

    setMessage('');
    setError('');

    try {
      await deleteAttendanceRecord(recordId);
      setMessage('Record presensi berhasil dihapus.');
      await fetchRecords();
    } catch (err) {
      console.error('Gagal menghapus presensi:', err);
      setError(err.message || 'Gagal menghapus presensi.');
    }
  }

  async function downloadExcel() {
    if (!records.length) {
      setError('Belum ada data presensi untuk diunduh.');
      return;
    }
    await exportAttendanceRecords(records);
  }

  useEffect(() => {
    fetchRecords();

    if (!supabase) return undefined;
    const channel = supabase
      .channel(`attendance-recap-${mode}-${user?.student?.id || 'teacher'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, fetchRecords)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, user?.student?.id]);

  const emptyText = mode === 'student' ? 'Belum ada riwayat presensi.' : 'Belum ada data presensi.';

  return (
    <>
      <PageHeader
        eyebrow="Rekap Presensi"
        title={title}
        description="Tampilan rekap untuk harian, mingguan, dan bulanan dengan metode serta status verifikasi."
        action={
          <button onClick={downloadExcel} disabled={!records.length} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-900 px-5 py-3 font-black text-white shadow-soft transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            <Download size={19} />
            Download Excel
          </button>
        }
      />
      <div className="card overflow-hidden">
        {message && <p className="m-4 rounded-2xl bg-lime-100 p-4 font-bold text-primary-900">{message}</p>}
        {error && <p className="m-4 rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{error}</p>}
        {loading && <p className="m-4 rounded-2xl bg-primary-50 p-4 font-bold text-primary-900">Memuat data presensi...</p>}
        {!loading && !error && !records.length && <p className="m-4 rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">{emptyText}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-primary-900 text-white">
              <tr>
                {['Tanggal', 'Jam', 'No Absen', 'Nama Siswa', 'Kelas', 'Status', 'Metode Presensi', 'Verifikasi', 'Keterangan', ...(mode === 'teacher' ? ['Aksi'] : [])].map((head) => (
                  <th key={head} className="px-5 py-4 text-sm font-black">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-primary-50">
                  <td className="px-5 py-4 font-semibold">{record.date}</td>
                  <td className="px-5 py-4">{record.time}</td>
                  <td className="px-5 py-4">{record.no_absen}</td>
                  <td className="px-5 py-4 font-black text-primary-900">{record.name}</td>
                  <td className="px-5 py-4">{record.class_name}</td>
                  <td className="px-5 py-4">{record.status}</td>
                  <td className="px-5 py-4">{record.method}</td>
                  <td className="px-5 py-4">{record.approval_status}</td>
                  <td className="px-5 py-4">{record.note}</td>
                  {mode === 'teacher' && (
                    <td className="px-5 py-4">
                      <button onClick={() => handleDelete(record.id)} className="rounded-full bg-rose-100 px-4 py-2 text-sm font-black text-rose-700 hover:bg-rose-200">
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StudentDashboard({ user, setUser }) {
  const student = user.student;
  const [myRecords, setMyRecords] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoMessage, setPhotoMessage] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const profilePhotoUrl = user.photo_url || student.photo_url;
  const canUploadPhoto = !profilePhotoUrl;

  async function fetchStudentAttendance() {
    setError('');
    try {
      const [history, todayRecord] = await Promise.all([
        getStudentAttendanceRecords(student.id),
        getStudentTodayAttendance(student.id, today),
      ]);
      setMyRecords(history);
      setTodayAttendance(todayRecord);
    } catch (err) {
      console.error('Gagal mengambil riwayat siswa:', err);
      setError(err.message || 'Gagal mengambil riwayat presensi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudentAttendance();

    if (!supabase) return undefined;
    const channel = supabase
      .channel(`student-attendance-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `student_id=eq.${student.id}` }, fetchStudentAttendance)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [student.id]);

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoMessage('');
    setPhotoError('');
    setPhotoUploading(true);

    try {
      const profile = await getCurrentProfile();
      const publicUrl = await uploadStudentProfilePhoto(file, profile);
      const refreshedProfile = await getCurrentProfile();
      const refreshedUser = toLoggedUser(refreshedProfile);
      localStorage.setItem('impressix-user', JSON.stringify(refreshedUser));
      setUser(refreshedUser);
      setPhotoMessage('Foto profil berhasil diunggah.');
      if (!refreshedUser.student?.photo_url && publicUrl) {
        setUser((current) => ({
          ...current,
          photo_url: publicUrl,
          student: { ...current.student, photo_url: publicUrl },
        }));
      }
    } catch (err) {
      console.error('Gagal upload foto profil:', err);
      setPhotoError(err.message || 'Gagal upload foto profil.');
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Dashboard Siswa" title={`Halo, ${student.name}`} description="Kelola presensi pribadi, ajukan izin dari rumah, dan lihat kegiatan kelas." />
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="card p-6">
          <Avatar src={profilePhotoUrl} name={student.name} className="h-28 w-28" />
          <h2 className="mt-5 text-2xl font-black text-primary-900">{student.name}</h2>
          <p className="mt-1 font-semibold text-slate-500">No. {student.no_absen} - {student.class_name}</p>
          <p className="font-semibold text-slate-500">{student.role_in_class}</p>
          <p className="mt-1 font-semibold text-slate-500">{student.email || user.email}</p>
          <p className="mt-1 font-semibold text-slate-500">Role akun: {user.role}</p>
          <div className="mt-5 rounded-3xl bg-primary-50 p-4">
            {canUploadPhoto ? (
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-900 px-5 py-3 font-black text-white transition hover:bg-primary-800">
                <ImagePlus size={18} />
                {photoUploading ? 'Mengunggah...' : 'Upload Foto Profil'}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={photoUploading}
                  onChange={handlePhotoUpload}
                />
              </label>
            ) : (
              <p className="font-bold text-primary-900">Foto profil sudah diunggah dan tidak dapat diubah kembali.</p>
            )}
            {photoMessage && <p className="mt-3 rounded-2xl bg-lime-100 p-3 text-sm font-bold text-primary-900">{photoMessage}</p>}
            {photoError && <p className="mt-3 rounded-2xl bg-rose-100 p-3 text-sm font-bold text-rose-800">{photoError}</p>}
          </div>
          {todayAttendance ? (
            <div className="mt-6 rounded-3xl bg-lime-100 p-4 font-black text-primary-900">
              Sudah presensi hari ini: {todayAttendance.status}
            </div>
          ) : (
            <Link to="/siswa/scan" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-900 px-5 py-3 font-black text-white">
              <ScanLine /> Scan QR Presensi
            </Link>
          )}
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-black text-primary-900">Riwayat presensi pribadi</h2>
          <div className="mt-5 grid gap-3">
            {error && <p className="rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{error}</p>}
            {loading && <p className="rounded-2xl bg-primary-50 p-4 font-semibold text-primary-900">Memuat riwayat presensi...</p>}
            {myRecords.length ? myRecords.map((record) => (
              <div key={record.id} className="rounded-2xl bg-primary-50 p-4">
                <p className="font-black text-primary-900">{record.status} - {record.date}</p>
                <p className="text-sm text-slate-500">{record.time} melalui {record.method}</p>
              </div>
            )) : !loading && !error && <p className="rounded-2xl bg-primary-50 p-4 font-semibold text-slate-600">Belum ada riwayat presensi.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function ScanPage({ activeSession, user }) {
  const [message, setMessage] = useState('Arahkan kamera ke QR presensi yang ditampilkan guru.');
  const [statusType, setStatusType] = useState('info');
  const student = user.student;

  async function validateScan(text) {
    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

      const payload = parseQrPayload(text);
      if (!payload) throw new Error('QR tidak valid atau session tidak ditemukan.');

      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('token', payload.token)
        .single();

      if (sessionError || !session) {
        throw new Error('QR tidak valid atau session tidak ditemukan.');
      }

      console.log('now', new Date().toISOString());
      console.log('expires_at', session.expires_at);
      console.log('expiredTime', new Date(session.expires_at).getTime());
      console.log('is_active', session.is_active);
      console.log('token', session.token);

      if (!session.is_active) {
        throw new Error('QR sudah tidak aktif. Silakan scan QR terbaru dari guru.');
      }

      if (!session.expires_at || isExpired(session.expires_at)) {
        throw new Error('QR sudah kadaluarsa. Silakan scan QR terbaru dari guru.');
      }

      const alreadyPresent = await getStudentTodayAttendance(student.id, today);
      if (alreadyPresent) {
        throw new Error('Kamu sudah melakukan presensi hari ini.');
      }

      await createAttendanceRecord({
        studentId: student.id,
        sessionId: session.id,
        status: 'Hadir',
        method: 'Scan QR Dinamis',
        note: 'Presensi berhasil.',
      });
      setStatusType('success');
      setMessage('Presensi berhasil.');
    } catch (err) {
      console.error('Gagal memproses scan QR:', err);
      const nextMessage = err.message || 'QR tidak valid atau session tidak ditemukan.';
      setStatusType(nextMessage.includes('sudah melakukan') ? 'warn' : 'error');
      setMessage(nextMessage);
    }
  }

  useEffect(() => {
    const elementId = 'qr-reader';
    const scanner = new Html5QrcodeScanner(elementId, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(validateScan, () => {});
    return () => scanner.clear().catch(() => {});
  }, []);

  const tone = {
    info: 'bg-primary-50 text-primary-800',
    success: 'bg-lime-100 text-primary-900',
    warn: 'bg-amber-100 text-amber-900',
    error: 'bg-rose-100 text-rose-800',
  }[statusType];

  return (
    <>
      <PageHeader eyebrow="Scan QR" title="Presensi hadir melalui kamera" description="Akun siswa dibaca otomatis dari sesi login. Nama tidak perlu dipilih manual." />
      <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
        <div className="card p-5">
          <div id="qr-reader" className="overflow-hidden rounded-3xl" />
        </div>
        <div className="card p-6">
          <div className={`rounded-3xl p-5 font-black ${tone}`}>{message}</div>
          <div className="mt-5 grid gap-3">
            {['Presensi berhasil.', 'QR sudah kadaluarsa. Silakan scan QR terbaru dari guru.', 'Kamu sudah melakukan presensi hari ini.', 'QR tidak valid atau session tidak ditemukan.'].map((text) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl bg-primary-50 p-4 font-semibold text-primary-900">
                {text === message ? <CheckCircle2 className="text-primary-700" /> : <XCircle className="text-slate-300" />} {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AbsenceFormPage({ user }) {
  const [form, setForm] = useState({ type: 'izin', reason: '', proof: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const student = user.student;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      if (!student?.id) throw new Error('Data siswa belum terhubung dengan akun ini.');
      if (!form.type) throw new Error('Jenis pengajuan wajib dipilih.');
      if (!form.reason.trim()) throw new Error('Alasan wajib diisi.');

      setLoading(true);
      const { error: submitError } = await supabase
        .from('absence_requests')
        .insert({
          student_id: student.id,
          type: form.type,
          reason: form.reason.trim(),
          date: today,
          status: 'pending',
        });

      if (submitError) {
        console.error('Gagal submit pengajuan:', submitError);
        throw new Error(submitError.message || 'Pengajuan gagal dikirim.');
      }

      setMessage('Pengajuan berhasil dikirim dan menunggu verifikasi guru.');
      setForm({ type: 'izin', reason: '', proof: '' });
    } catch (err) {
      setError(err.message || 'Pengajuan gagal dikirim.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Form Rumah" title="Ajukan izin, sakit, atau tidak hadir" description="Status Hadir tidak tersedia dari rumah. Hadir hanya bisa melalui scan QR dinamis." />
      <form onSubmit={submit} className="card max-w-3xl p-6">
        <div className="grid gap-4">
          <label className="grid gap-2 font-bold text-primary-900">
            Nama siswa
            <input readOnly value={student.name} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3" />
          </label>
          <label className="grid gap-2 font-bold text-primary-900">
            Tanggal
            <input readOnly value={today} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3" />
          </label>
          <label className="grid gap-2 font-bold text-primary-900">
            Status
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="tidak_hadir">Tidak Hadir</option>
            </select>
          </label>
          <label className="grid gap-2 font-bold text-primary-900">
            Keterangan
            <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows="4" className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3" placeholder="Tulis alasan pengajuan" />
          </label>
          <label className="grid gap-2 font-bold text-primary-900">
            Upload bukti opsional
            <input type="file" onChange={(event) => setForm({ ...form, proof: event.target.files?.[0]?.name || '' })} className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3" />
          </label>
        </div>
        <button disabled={loading} className="mt-6 rounded-full bg-primary-900 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{loading ? 'Mengirim...' : 'Kirim Pengajuan'}</button>
        {message && <p className="mt-5 rounded-2xl bg-lime-100 p-4 font-black text-primary-900">{message}</p>}
        {error && <p className="mt-5 rounded-2xl bg-rose-100 p-4 font-bold text-rose-800">{error}</p>}
      </form>
    </>
  );
}

function Protected({ user, role, authReady, children }) {
  if (!authReady) {
    return (
      <main className="min-h-screen bg-mint bg-grid bg-[length:28px_28px] p-4">
        <div className="mx-auto flex min-h-[calc(100vh-32px)] max-w-4xl items-center justify-center rounded-[2rem] bg-white shadow-soft">
          <p className="font-black text-primary-900">Memeriksa sesi...</p>
        </div>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'teacher' ? '/guru' : '/siswa'} replace />;
  if (role === 'student' && !user.student) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!supabase) {
        localStorage.removeItem('impressix-user');
        if (isMounted) setAuthReady(true);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;

        if (!sessionUser) {
          localStorage.removeItem('impressix-user');
          if (isMounted) setUser(null);
          return;
        }

        const loggedUser = await getLoggedUserFromProfile(sessionUser.id);
        localStorage.setItem('impressix-user', JSON.stringify(loggedUser));
        if (isMounted) setUser(loggedUser);
      } catch {
        localStorage.removeItem('impressix-user');
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setAuthReady(true);
      }
    }

    restoreSession();
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        localStorage.removeItem('impressix-user');
        setUser(null);
        setActiveSession(null);
        setAuthReady(true);
        return;
      }

      restoreSession();
    }) || { data: { subscription: null } };

    return () => {
      isMounted = false;
      listener.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('impressix-user');
    setUser(null);
    setActiveSession(null);
    navigate('/login');
  };

  const teacherShell = (children) => (
    <Protected user={user} role="teacher" authReady={authReady}>
      <Shell role="teacher" onLogout={logout}>{children}</Shell>
    </Protected>
  );
  const studentShell = (children) => (
    <Protected user={user} role="student" authReady={authReady}>
      <Shell role="student" onLogout={logout}>{children}</Shell>
    </Protected>
  );

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage setUser={setUser} />} />
      <Route path="/guru" element={teacherShell(<TeacherDashboard user={user} />)} />
      <Route path="/guru/profil-kelas" element={teacherShell(<ProfileClassPage />)} />
      <Route path="/guru/data-siswa" element={teacherShell(<StudentsPage />)} />
      <Route path="/guru/qr-presensi" element={teacherShell(<QrAttendancePage activeSession={activeSession} setActiveSession={setActiveSession} user={user} />)} />
      <Route path="/guru/verifikasi" element={teacherShell(<VerificationPage user={user} />)} />
      <Route path="/guru/kegiatan" element={teacherShell(<ActivitiesPage user={user} />)} />
      <Route path="/guru/rekap" element={teacherShell(<RecapPage user={user} />)} />
      <Route path="/siswa" element={studentShell(<StudentDashboard user={user} setUser={setUser} />)} />
      <Route path="/siswa/profil-kelas" element={studentShell(<ProfileClassPage />)} />
      <Route path="/siswa/scan" element={studentShell(<ScanPage activeSession={activeSession} user={user} />)} />
      <Route path="/siswa/izin" element={studentShell(<AbsenceFormPage user={user} />)} />
      <Route path="/siswa/kegiatan" element={studentShell(<ActivitiesPage user={user} />)} />
      <Route path="/siswa/riwayat" element={studentShell(<RecapPage mode="student" title="Riwayat presensi pribadi" user={user} />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
