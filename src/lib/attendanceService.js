import { supabase, TABLES } from './supabase';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  return supabase;
}

export function normalizeAttendanceRecord(record) {
  const student = record.students || record.student || null;
  return {
    ...record,
    student,
    name: student?.name || record.name || '-',
    no_absen: student?.no_absen ?? record.no_absen ?? '-',
    class_name: student?.class_name || record.class_name || '-',
    student_email: student?.email || record.student_email || '',
    role_in_class: student?.role_in_class || record.role_in_class || '',
  };
}

const attendanceSelect = `
  *,
  students (
    id,
    no_absen,
    name,
    class_name,
    email,
    role_in_class,
    photo_url
  )
`;

export function toLoggedUser(profile) {
  return {
    id: profile.id,
    user_id: profile.user_id,
    name: profile.role === 'student' ? profile.students?.name || profile.name : profile.name,
    email: profile.email,
    role: profile.role,
    photo_url: profile.photo_url || null,
    student_id: profile.role === 'student' ? profile.student_id : null,
    student: profile.role === 'student' ? profile.students : null,
  };
}

export async function getCurrentProfile() {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Session pengguna tidak ditemukan.');

  const { data: profile, error } = await client
    .from(TABLES.profiles)
    .select('*, students(*)')
    .eq('user_id', userId)
    .single();

  if (error || !profile) throw new Error('Profil pengguna tidak ditemukan atau role belum diatur.');
  return profile;
}

export async function getStudents() {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.students)
    .select('id, no_absen, name, class_name, role_in_class, email, photo_url, created_at')
    .order('no_absen', { ascending: true });
  if (error) throw error;
  return data || [];
}

function validateImageFile(file, maxSizeMb) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!file) throw new Error('File foto wajib dipilih.');
  if (!allowedTypes.includes(file.type)) throw new Error('File harus berupa jpg, jpeg, png, atau webp.');
  if (file.size > maxSizeMb * 1024 * 1024) throw new Error(`Ukuran file maksimal ${maxSizeMb} MB.`);
}

function getSafeImageExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  return extension === 'jpeg' ? 'jpg' : extension;
}

export async function uploadStudentProfilePhoto(file, profile) {
  const client = requireSupabase();
  validateImageFile(file, 2);
  if (profile.role !== 'student') throw new Error('Upload foto hanya tersedia untuk siswa.');
  if (!profile.student_id || !profile.students?.id) throw new Error('Data siswa belum terhubung dengan akun ini.');
  if (profile.photo_url || profile.students?.photo_url) {
    throw new Error('Foto profil sudah diunggah dan tidak dapat diubah kembali.');
  }

  const safeExtension = getSafeImageExtension(file);
  const path = `${profile.student_id}-${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await client.storage
    .from('student-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = client.storage.from('student-photos').getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const { error: profileError } = await client
    .from(TABLES.profiles)
    .update({ photo_url: publicUrl })
    .eq('id', profile.id)
    .eq('user_id', profile.user_id);
  if (profileError) throw profileError;

  const { error: studentError } = await client
    .from(TABLES.students)
    .update({ photo_url: publicUrl })
    .eq('id', profile.student_id);
  if (studentError) throw studentError;

  return publicUrl;
}

async function uploadActivityPhoto(file) {
  const client = requireSupabase();
  validateImageFile(file, 3);
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Session pengguna tidak ditemukan.');

  const path = `${userId}-${Date.now()}.${getSafeImageExtension(file)}`;
  const { error } = await client.storage
    .from('activity-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;
  const { data } = client.storage.from('activity-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function getActivities() {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.activities)
    .select('id, title, date, description, image_url, created_at')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createActivity({ title, date, description, file }) {
  const client = requireSupabase();
  if (!title?.trim()) throw new Error('Judul kegiatan wajib diisi.');
  if (!date) throw new Error('Tanggal kegiatan wajib diisi.');
  if (!description?.trim()) throw new Error('Deskripsi kegiatan wajib diisi.');
  const imageUrl = await uploadActivityPhoto(file);

  const { data, error } = await client
    .from(TABLES.activities)
    .insert({
      title: title.trim(),
      date,
      description: description.trim(),
      image_url: imageUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateActivity(activityId, { title, date, description, file }) {
  const client = requireSupabase();
  if (!title?.trim()) throw new Error('Judul kegiatan wajib diisi.');
  if (!date) throw new Error('Tanggal kegiatan wajib diisi.');
  if (!description?.trim()) throw new Error('Deskripsi kegiatan wajib diisi.');

  const payload = {
    title: title.trim(),
    date,
    description: description.trim(),
  };

  if (file) {
    payload.image_url = await uploadActivityPhoto(file);
  }

  const { data, error } = await client
    .from(TABLES.activities)
    .update(payload)
    .eq('id', activityId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile, error: profileError } = await client
    .from(TABLES.profiles)
    .select('*, students(*)')
    .eq('user_id', data.user.id)
    .single();
  if (profileError) throw profileError;
  return { session: data.session, user: data.user, profile };
}

export async function getTeacherAttendanceRecords() {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.attendanceRecords)
    .select(attendanceSelect)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeAttendanceRecord);
}

export async function getTodayAttendanceRecords(date = new Date().toISOString().slice(0, 10)) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.attendanceRecords)
    .select(attendanceSelect)
    .eq('date', date)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeAttendanceRecord);
}

export async function getStudentAttendanceRecords(studentId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.attendanceRecords)
    .select(attendanceSelect)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeAttendanceRecord);
}

export async function getStudentTodayAttendance(studentId, date = new Date().toISOString().slice(0, 10)) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.attendanceRecords)
    .select(attendanceSelect)
    .eq('student_id', studentId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeAttendanceRecord(data) : null;
}

export async function createAttendanceRecord({ studentId, sessionId, status = 'Hadir', method = 'Scan QR Dinamis', note = 'Presensi berhasil.' }) {
  const client = requireSupabase();
  const existing = await getStudentTodayAttendance(studentId);
  if (existing) throw new Error('Kamu sudah melakukan presensi hari ini.');

  const now = new Date();
  const { data, error } = await client
    .from(TABLES.attendanceRecords)
    .insert({
      student_id: studentId,
      session_id: sessionId || null,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      status,
      method,
      note,
      approval_status: 'Terverifikasi',
    })
    .select(attendanceSelect)
    .single();

  if (error?.code === '23505') throw new Error('Kamu sudah melakukan presensi hari ini.');
  if (error) throw error;
  return normalizeAttendanceRecord(data);
}

export async function deleteAttendanceRecord(recordId) {
  const client = requireSupabase();
  const { error } = await client
    .from(TABLES.attendanceRecords)
    .delete()
    .eq('id', recordId);
  if (error) throw error;
}

export async function createAttendanceSession(payload, userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.attendanceSessions)
    .insert({
      token: payload.token,
      class_name: payload.class_name,
      created_by: userId,
      expires_at: new Date(payload.expires_at).toISOString(),
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitAbsenceRequest({ studentId, type, reason, date, proofUrl }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.absenceRequests)
    .insert({
      student_id: studentId,
      type,
      reason,
      date,
      status: 'pending',
      proof_url: proofUrl || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAbsenceApproval(id, status, verifiedBy) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.absenceRequests)
    .update({ status, verified_by: verifiedBy, verified_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function exportAttendanceRecords(records) {
  const XLSX = await import('xlsx');
  const rows = records.map((record) => ({
    Tanggal: record.date,
    Waktu: record.time,
    'No Absen': record.no_absen,
    'Nama Siswa': record.name,
    Kelas: record.class_name,
    Status: record.status,
    Metode: record.method,
    Catatan: record.note || '',
    'Status Verifikasi': record.approval_status || '',
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 20 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi');
  XLSX.writeFile(workbook, `rekap-presensi-impressix-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function uploadProfilePhoto({ bucket = 'class-photos', path, file }) {
  const client = requireSupabase();
  const { error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function updateProfilePhoto(profileId, photoUrl) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.profiles)
    .update({ photo_url: photoUrl })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudentPhoto(studentId, photoUrl) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLES.students)
    .update({ photo_url: photoUrl })
    .eq('id', studentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
