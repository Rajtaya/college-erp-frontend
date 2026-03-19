import React, { useState, useEffect } from 'react';
import API from '../api';

export default function TeacherDashboard({ teacher, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [form, setForm] = useState({ student_id: '', subject_id: '', date: '', status: 'PRESENT' });
  const [markForm, setMarkForm] = useState({ student_id: '', subject_id: '', exam_type: 'INTERNAL', marks_obtained: '', max_marks: '', semester: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchSubjects(); fetchStudents(); }, []);
  useEffect(() => { if (activeTab === 'attendance') fetchAttendance(); }, [activeTab]);

  const fetchSubjects = async () => { const r = await API.get('/subjects'); setSubjects(r.data); };
  const fetchStudents = async () => { const r = await API.get('/admin/students'); setStudents(r.data); };
  const fetchAttendance = async () => { const r = await API.get('/admin/attendance'); setAttendance(r.data); };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      await API.post('/attendance', form);
      setMsg('Attendance marked successfully!');
      setForm({ student_id: '', subject_id: '', date: '', status: 'PRESENT' });
      fetchAttendance();
    } catch (err) { setMsg(err.response?.data?.error || 'Error'); }
  };

  const handleAddMarks = async (e) => {
    e.preventDefault();
    try {
      await API.post('/marks', markForm);
      setMsg('Marks added successfully!');
      setMarkForm({ student_id: '', subject_id: '', exam_type: 'INTERNAL', marks_obtained: '', max_marks: '', semester: '' });
    } catch (err) { setMsg(err.response?.data?.error || 'Error'); }
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h2 style={styles.navTitle}>🎓 College ERP — Teacher Panel</h2>
        <div style={styles.navRight}>
          <span style={styles.teacherName}>👤 {teacher.name}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.tabs}>
        {['overview','attendance','marks'].map(tab => (
          <button key={tab} style={{...styles.tab, ...(activeTab===tab ? styles.activeTab : {})}}
            onClick={() => { setActiveTab(tab); setMsg(''); }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}

      <div style={styles.content}>
        {activeTab === 'overview' && (
          <div>
            <div style={styles.welcome}>
              <h1>Welcome, {teacher.name}! 👋</h1>
              <p style={styles.meta}>Department: {teacher.department} &nbsp;|&nbsp; Email: {teacher.email}</p>
            </div>
            <div style={styles.cards}>
              <div style={{...styles.card, background: '#667eea'}}>
                <h3>📚 Subjects</h3>
                <p style={styles.cardNum}>{subjects.length}</p>
                <p>Total Subjects</p>
              </div>
              <div style={{...styles.card, background: '#48bb78'}}>
                <h3>👨‍🎓 Students</h3>
                <p style={styles.cardNum}>{students.length}</p>
                <p>Total Students</p>
              </div>
              <div style={{...styles.card, background: '#ed8936'}}>
                <h3>📅 Attendance</h3>
                <p style={styles.cardNum}>{attendance.length}</p>
                <p>Records Marked</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <h3>Mark Attendance</h3>
            <form onSubmit={handleMarkAttendance} style={styles.form}>
              <select style={styles.input} value={form.student_id}
                onChange={e => setForm({...form, student_id: e.target.value})} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.roll_no} - {s.name}</option>)}
              </select>
              <select style={styles.input} value={form.subject_id}
                onChange={e => setForm({...form, subject_id: e.target.value})} required>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_code} - {s.subject_name}</option>)}
              </select>
              <input style={styles.input} type="date" value={form.date}
                onChange={e => setForm({...form, date: e.target.value})} required />
              <select style={styles.input} value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
              </select>
              <button style={styles.addBtn} type="submit">Mark Attendance</button>
            </form>
            <h3>Attendance Records ({attendance.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['Student','Subject','Date','Status'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{attendance.map(a=>(
                <tr key={a.attendance_id}>
                  <td style={styles.td}>{a.student_name}</td>
                  <td style={styles.td}>{a.subject_name}</td>
                  <td style={styles.td}>{new Date(a.date).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <span style={{...styles.badge, background: a.status==='PRESENT'?'#48bb78':a.status==='LATE'?'#ed8936':'#e53e3e'}}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {activeTab === 'marks' && (
          <div>
            <h3>Add Marks</h3>
            <form onSubmit={handleAddMarks} style={styles.form}>
              <select style={styles.input} value={markForm.student_id}
                onChange={e => setMarkForm({...markForm, student_id: e.target.value})} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.roll_no} - {s.name}</option>)}
              </select>
              <select style={styles.input} value={markForm.subject_id}
                onChange={e => setMarkForm({...markForm, subject_id: e.target.value})} required>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_code} - {s.subject_name}</option>)}
              </select>
              <select style={styles.input} value={markForm.exam_type}
                onChange={e => setMarkForm({...markForm, exam_type: e.target.value})}>
                <option value="INTERNAL">Internal</option>
                <option value="EXTERNAL">External</option>
                <option value="PRACTICAL">Practical</option>
              </select>
              <input style={styles.input} type="number" placeholder="Marks Obtained" value={markForm.marks_obtained}
                onChange={e => setMarkForm({...markForm, marks_obtained: e.target.value})} required />
              <input style={styles.input} type="number" placeholder="Max Marks" value={markForm.max_marks}
                onChange={e => setMarkForm({...markForm, max_marks: e.target.value})} required />
              <input style={styles.input} type="number" placeholder="Semester" value={markForm.semester}
                onChange={e => setMarkForm({...markForm, semester: e.target.value})} required />
              <button style={styles.addBtn} type="submit">Add Marks</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#276749', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navTitle: { color: '#fff', margin: 0 },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  teacherName: { color: '#c6f6d5' },
  logoutBtn: { background: '#e53e3e', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '2px solid #e2e8f0', padding: '0 2rem' },
  tab: { padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', color: '#718096', textTransform: 'capitalize' },
  activeTab: { color: '#38a169', borderBottom: '2px solid #38a169', fontWeight: '600' },
  content: { padding: '2rem' },
  msg: { background: '#c6f6d5', color: '#276749', padding: '0.75rem 2rem', fontWeight: '600' },
  welcome: { background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  meta: { color: '#718096', marginTop: '0.5rem' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  card: { padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  cardNum: { fontSize: '2.5rem', fontWeight: '700', margin: '0.5rem 0' },
  form: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: '10px' },
  input: { padding: '0.6rem 0.9rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95rem', minWidth: '180px' },
  addBtn: { padding: '0.6rem 1.5rem', background: '#38a169', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  th: { background: '#276749', color: '#fff', padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.9rem' },
  td: { padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' },
  badge: { padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#fff', fontSize: '0.8rem', fontWeight: '600' },
};
