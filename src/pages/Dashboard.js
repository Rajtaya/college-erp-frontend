import React, { useState, useEffect } from 'react';
import API from '../api';

export default function Dashboard({ student, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line
  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendance();
  }, [activeTab]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const r = await API.get(`/attendance/student/${student.student_id}`);
      setAttendance(r.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Calculate attendance stats per subject
  const getStats = () => {
    const subjectMap = {};
    attendance.forEach(a => {
      if (!subjectMap[a.subject_name]) subjectMap[a.subject_name] = { present: 0, absent: 0, late: 0, total: 0 };
      subjectMap[a.subject_name].total++;
      if (a.status === 'PRESENT') subjectMap[a.subject_name].present++;
      else if (a.status === 'ABSENT') subjectMap[a.subject_name].absent++;
      else if (a.status === 'LATE') subjectMap[a.subject_name].late++;
    });
    return subjectMap;
  };

  const stats = getStats();
  const totalClasses = attendance.length;
  const totalPresent = attendance.filter(a => a.status === 'PRESENT').length;
  const overallPct = totalClasses ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h2 style={styles.navTitle}>🎓 College ERP</h2>
        <div style={styles.navRight}>
          <span style={styles.studentName}>👤 {student.name}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.tabs}>
        {['overview', 'attendance'].map(tab => (
          <button key={tab} style={{...styles.tab, ...(activeTab===tab ? styles.activeTab : {})}}
            onClick={() => setActiveTab(tab)}>
            {tab === 'overview' ? '🏠 Overview' : '📅 Attendance'}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div style={styles.welcome}>
              <h1>Welcome, {student.name}! 👋</h1>
              <p style={styles.meta}>
                Roll No: <strong>{student.roll_no}</strong> &nbsp;|&nbsp;
                Course: <strong>{student.course}</strong> &nbsp;|&nbsp;
                Semester: <strong>{student.semester}</strong>
              </p>
            </div>
            <div style={styles.cards}>
              <div style={{...styles.card, background: '#667eea'}} onClick={() => setActiveTab('attendance')}>
                <h3>📅 Attendance</h3>
                <p>View your attendance records</p>
                <p style={styles.cardArrow}>→ Click to view</p>
              </div>
              <div style={{...styles.card, background: '#48bb78'}}>
                <h3>💰 Fees</h3>
                <p>View your fee status</p>
                <p style={styles.cardArrow}>Coming soon</p>
              </div>
              <div style={{...styles.card, background: '#9f7aea'}}>
                <h3>📊 Marks</h3>
                <p>Check your exam results</p>
                <p style={styles.cardArrow}>Coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div>
            {/* Overall Summary */}
            <div style={styles.summaryBox}>
              <h2 style={{margin:0, marginBottom:'1rem'}}>📅 My Attendance</h2>
              <div style={styles.summaryCards}>
                <div style={{...styles.summaryCard, background: '#ebf8ff', borderColor: '#90cdf4'}}>
                  <p style={styles.summaryNum}>{totalClasses}</p>
                  <p style={styles.summaryLabel}>Total Classes</p>
                </div>
                <div style={{...styles.summaryCard, background: '#f0fff4', borderColor: '#9ae6b4'}}>
                  <p style={styles.summaryNum}>{totalPresent}</p>
                  <p style={styles.summaryLabel}>Present</p>
                </div>
                <div style={{...styles.summaryCard, background: '#fff5f5', borderColor: '#feb2b2'}}>
                  <p style={styles.summaryNum}>{totalClasses - totalPresent}</p>
                  <p style={styles.summaryLabel}>Absent/Late</p>
                </div>
                <div style={{...styles.summaryCard,
                  background: overallPct >= 75 ? '#f0fff4' : '#fff5f5',
                  borderColor: overallPct >= 75 ? '#9ae6b4' : '#feb2b2'}}>
                  <p style={{...styles.summaryNum, color: overallPct >= 75 ? '#276749' : '#c53030'}}>{overallPct}%</p>
                  <p style={styles.summaryLabel}>Overall %</p>
                </div>
              </div>
              {overallPct < 75 && totalClasses > 0 && (
                <div style={styles.warningBanner}>
                  ⚠️ Your attendance is below 75%! You need to attend more classes.
                </div>
              )}
              {overallPct >= 75 && totalClasses > 0 && (
                <div style={styles.goodBanner}>
                  ✅ Great! Your attendance is above 75%.
                </div>
              )}
            </div>

            {/* Subject-wise Stats */}
            {Object.keys(stats).length > 0 && (
              <div style={styles.subjectStats}>
                <h3>Subject-wise Attendance</h3>
                <div style={styles.subjectGrid}>
                  {Object.entries(stats).map(([subject, data]) => {
                    const pct = ((data.present / data.total) * 100).toFixed(1);
                    return (
                      <div key={subject} style={styles.subjectCard}>
                        <h4 style={styles.subjectName}>{subject}</h4>
                        <div style={styles.progressBar}>
                          <div style={{...styles.progressFill, width: `${pct}%`, background: pct >= 75 ? '#48bb78' : '#e53e3e'}} />
                        </div>
                        <div style={styles.subjectMeta}>
                          <span style={{color: pct >= 75 ? '#276749' : '#c53030', fontWeight: '700'}}>{pct}%</span>
                          <span style={{color:'#718096'}}>{data.present}/{data.total} classes</span>
                        </div>
                        <div style={styles.subjectBadges}>
                          <span style={{...styles.badge, background:'#48bb78'}}>P: {data.present}</span>
                          <span style={{...styles.badge, background:'#e53e3e'}}>A: {data.absent}</span>
                          {data.late > 0 && <span style={{...styles.badge, background:'#ed8936'}}>L: {data.late}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attendance Records Table */}
            <h3>Attendance Records</h3>
            {loading ? (
              <p>Loading...</p>
            ) : attendance.length === 0 ? (
              <div style={styles.emptyState}>📭 No attendance records found.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>{['Date','Subject','Status'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {attendance.map(a=>(
                    <tr key={a.attendance_id}>
                      <td style={styles.td}>{new Date(a.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</td>
                      <td style={styles.td}>{a.subject_name}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge, background: a.status==='PRESENT'?'#48bb78':a.status==='LATE'?'#ed8936':'#e53e3e'}}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#2d3748', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navTitle: { color: '#fff', margin: 0 },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  studentName: { color: '#a0aec0' },
  logoutBtn: { background: '#e53e3e', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '2px solid #e2e8f0', padding: '0 2rem' },
  tab: { padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', color: '#718096' },
  activeTab: { color: '#4c51bf', borderBottom: '2px solid #4c51bf', fontWeight: '600' },
  content: { padding: '2rem' },
  welcome: { background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  meta: { color: '#718096', marginTop: '0.5rem' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  card: { padding: '1.5rem', borderRadius: '12px', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer' },
  cardArrow: { marginTop: '0.5rem', opacity: 0.8, fontSize: '0.9rem' },
  summaryBox: { background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '1rem' },
  summaryCard: { padding: '1rem', borderRadius: '10px', border: '2px solid', textAlign: 'center' },
  summaryNum: { fontSize: '2rem', fontWeight: '700', margin: 0 },
  summaryLabel: { color: '#718096', margin: '0.25rem 0 0', fontSize: '0.85rem' },
  warningBanner: { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '8px', padding: '0.75rem 1rem', fontWeight: '600' },
  goodBanner: { background: '#f0fff4', color: '#276749', border: '1px solid #9ae6b4', borderRadius: '8px', padding: '0.75rem 1rem', fontWeight: '600' },
  subjectStats: { background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  subjectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' },
  subjectCard: { background: '#f7fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' },
  subjectName: { margin: '0 0 0.75rem', color: '#2d3748', fontSize: '0.95rem' },
  progressBar: { height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.5rem' },
  progressFill: { height: '100%', borderRadius: '999px', transition: 'width 0.3s ease' },
  subjectMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' },
  subjectBadges: { display: 'flex', gap: '0.4rem' },
  badge: { padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#fff', fontSize: '0.75rem', fontWeight: '600' },
  emptyState: { background: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '12px', color: '#718096', fontSize: '1.1rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  th: { background: '#2d3748', color: '#fff', padding: '0.75rem 1rem', textAlign: 'left' },
  td: { padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' },
};
