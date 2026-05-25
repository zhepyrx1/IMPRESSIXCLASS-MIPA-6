import principalPhoto from '../assets/profiles/principal.jpg';
import teacherPhoto from '../assets/profiles/teacher.jpg';
import leaderPhoto from '../assets/profiles/leader.jpg';
import viceLeaderPhoto from '../assets/profiles/vice-leader.jpg';
import studentA from '../assets/profiles/student-a.svg';
import studentB from '../assets/profiles/student-b.svg';
import studentC from '../assets/profiles/student-c.svg';
import studentD from '../assets/profiles/student-d.svg';

const studentPhotos = [studentA, studentB, studentC, studentD];

const names = [
  'Alya Putri Ramadhani',
  'Bagas Pratama',
  'Cahaya Nabila',
  'Daffa Al Farizi',
  'Elvina Zahra',
  'Farhan Maulana',
  'Gita Maharani',
  'Muhammad Arsal Arash',
  'Intan Permata',
  'Jihan Aulia',
  'Kenzi Ardiansyah',
  'Laras Ayuningtyas',
  'Mikhael Jonathan',
  'Nadira Safitri',
  'Oka Wiratama',
  'Putri Amalia',
  'Qori Anindita',
  'Rafi Naufal',
  'Salsabila Fitri',
  'Tegar Mahendra',
  'Ulfa Khairunnisa',
  'Vania Kirana',
  'Wahyu Saputra',
  'Xaviera Nadine',
  'Yusuf Fadillah',
  'Zahra Khumaira',
  'Aditya Nugraha',
  'Bella Oktavia',
  'Chandra Wijaya',
  'Dinda Kurniasari',
  'Erlangga Putra',
  'Fira Anastasya',
  'Galih Prakoso',
  'Hanum Lestari',
  'Iqbal Ramadhan',
  'Julia Maharani',
];

const roles = {
  1: 'Ketua Kelas',
  2: 'Wakil Ketua Kelas',
  5: 'Bendahara',
  9: 'Sekretaris',
  14: 'Koordinator Kebersihan',
  22: 'Koordinator Kegiatan',
};

export const classProfile = {
  school: 'SMAN 2 CIKARANG SELATAN',
  className: 'IMPRESSIX CLASS - MIPA 6',
  shortName: 'MIPA 6',
  totalStudents: 36,
  description:
    'Kelas digital modern yang menggabungkan budaya belajar rapi, presensi real-time, dokumentasi kegiatan, dan kolaborasi siswa dalam satu sistem yang resmi dan mudah digunakan.',
  slogan: 'Solid, scientific, expressive, and ready to impress.',
};

export const students = names.map((name, index) => {
  const no = index + 1;
  return {
    id: `student-${no}`,
    no_absen: no,
    name,
    class_name: classProfile.shortName,
    role_in_class: roles[no] || 'Anggota Kelas',
    email: `${name.toLowerCase().split(' ')[0]}.${String(no).padStart(2, '0')}@impressix.sch.id`,
    photo_url: studentPhotos[index % studentPhotos.length],
    description: `${roles[no] || 'Anggota kelas'} yang aktif dalam kegiatan belajar dan program kelas digital.`,
    created_at: new Date().toISOString(),
  };
});

export const leaders = [
  {
    id: 'principal',
    label: 'Kepala Sekolah',
    name: 'Sadikin, S.pd., M.Pd..',
    photo_url: principalPhoto,
    description: 'Mendukung transformasi digital kelas melalui tata kelola sekolah yang modern dan terarah.',
  },
  {
    id: 'teacher',
    label: 'Wali Kelas MIPA 6',
    name: 'Eki Septiana, S.Pd.',
    photo_url: teacherPhoto,
    description: 'Mendampingi siswa MIPA 6 dalam pembelajaran, kedisiplinan, dan pengembangan karakter.',
  },
  {
    id: 'leader',
    label: 'Ketua Kelas',
    name: 'Harsya Al Ghiffary',
    photo_url: leaderPhoto,
    description: 'Mengkoordinasikan kegiatan kelas dan menjadi penghubung antara siswa dan wali kelas.',
  },
  {
    id: 'vice-leader',
    label: 'Wakil Ketua Kelas',
    name: 'Radina',
    photo_url: viceLeaderPhoto,
    description: 'Membantu koordinasi kelas, agenda harian, dan kelancaran kegiatan siswa.',
  },
];

export const leadershipGroups = {
  school: leaders.slice(0, 2),
  class: leaders.slice(2, 4),
};
