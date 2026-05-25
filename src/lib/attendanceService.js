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
