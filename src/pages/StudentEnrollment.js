import React, { useState, useEffect } from 'react';
import API from '../api';

const categoryLabels = {
  MAJOR: 'Discipline Specific Course (DSC)',
  MIC:   'Minor Course / Vocational',
  MDC:   'Multidisciplinary Course',
  SEC:   'Skill Enhancement Course',
  VAC:   'Value Added Course',
  AEC:   'Ability Enhancement Course',
  MINOR: 'Minor Course',
  DSC:   'Discipline Specific Course',
};

const categoryColors = {
  MAJOR:'#4c51bf', MIC:'#057a55', MDC:'#dd6b20',
  SEC:'#e53e3e', VAC:'#d69e2e', AEC:'#805ad5',
  MINOR:'#38a169', DSC:'#0694a2'
};

export default function StudentEnrollment({ student, onBack }) {
  const [subjects, setSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');

  useEffect(() => {
    fetchSubjectsAndEnrollments();
  }, []);

  const fetchSubjectsAndEnrollments = async () => {
    setLoading(true);
    try {
      const [subRes, enrollRes] = await Promise.all([
        API.get(`/enrollment/subjects/${student.student_id}`),
        API.get(`/enrollment/status/${student.student_id}`)
      ]);

      setSubjects(subRes.data);

      // Check if already submitted
      const hasSubmitted = enrollRes.data.some(e => e.status !== 'PENDING');
      setSubmitted(hasSubmitted);

      // Build enrollment state from existing data
      const enrollState = {};
      subRes.data.forEach(s => {
        enrollState[s.subject_id] = {
          status: s.enrollment_status || 'PENDING',
          is_major: s.is_major || false,
          remarks: s.remarks || '',
        };
      });
      setEnrollments(enrollState);
    } catch(e) {
      showMsg('Failed to load subjects', 'error');
    } finally { setLoading(false); }
  };

  const showMsg = (text, type='success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const updateEnrollment = (subject_id, field, value) => {
    if (submitted) return;
    setEnrollments(prev => ({
      ...prev,
      [subject_id]: { ...prev[subject_id], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    // Validate - all subjects must have a decision
    const pending = subjects.filter(s => enrollments[s.subject_id]?.status === 'PENDING');
    if (pending.length > 0) {
      showMsg(`⚠️ Please make a decision for all ${pending.length} remaining subjects!`, 'error');
      return;
    }

    // Validate - at least one MAJOR subject must be selected
    const majorSelected = subjects.filter(s =>
      s.category === 'MAJOR' && enrollments[s.subject_id]?.status === 'ACCEPTED'
    );
    if (majorSelected.length === 0) {
      showMsg('⚠️ Please accept at least one Major subject!', 'error');
      return;
    }

    if (!window.confirm('Are you sure? This action cannot be undone. Contact admin to reset.')) return;

    setSubmitting(true);
    try {
      const payload = subjects.map(s => ({
        subject_id: s.subject_id,
        status: enrollments[s.subject_id]?.status || 'PENDING',
        is_major: enrollments[s.subject_id]?.is_major || false,
        remarks: enrollments[s.subject_id]?.remarks || '',
      }));

      await API.post(`/enrollment/submit/${student.student_id}`, { enrollments: payload });
      showMsg('✅ Enrollment submitted successfully!', 'success');
      setSubmitted(true);
      fetchSubjectsAndEnrollments();
    } catch(err) {
      showMsg(err.response?.data?.error || 'Failed to submit', 'error');
    } finally { setSubmitting(false); }
  };

  // Group by category
  const grouped = subjects.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const totalSubjects = subjects.length;
  const acceptedCount = Object.values(enrollments).filter(e => e.status === 'ACCEPTED').length;
  const rejectedCount = Object.values(enrollments).filter(e => e.status === 'REJECTED').length;
  const pendingCount = Object.values(enrollments).filter(e => e.status === 'PENDING').length;

  if (loading) return <div style={s.loading}>⏳ Loading your subjects...</div>;

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <div>
          <h2 style={s.headerTitle}>📋 Subject Enrollment</h2>
          <p style={s.headerSub}>{student.name} | {student.roll_no} | Semester {student.semester}</p>
        </div>
      </div>

      {msg && <div style={{...s.msg, background: msgType==='error'?'#fff5f5':'#c6f6d5', color: msgType==='error'?'#c53030':'#276749'}}>{msg}</div>}

      {/* Status Banner */}
      {submitted ? (
        <div style={s.submittedBanner}>
          ✅ <strong>Enrollment Submitted!</strong> Your subject choices have been recorded. Contact admin if you need to make changes.
        </div>
      ) : (
        <div style={s.infoBanner}>
          ℹ️ <strong>One-time action:</strong> Review all subjects carefully. Accept or raise an error for each subject. Once submitted, you cannot change your choices.
        </div>
      )}

      {/* Progress Summary */}
      <div style={s.summaryBar}>
        <div style={{...s.summaryItem, background:'#ebf8ff'}}>
          <span style={s.summaryNum}>{totalSubjects}</span>
          <span style={s.summaryLabel}>Total</span>
        </div>
        <div style={{...s.summaryItem, background:'#f0fff4'}}>
          <span style={{...s.summaryNum, color:'#276749'}}>{acceptedCount}</span>
          <span style={s.summaryLabel}>Accepted</span>
        </div>
        <div style={{...s.summaryItem, background:'#fff5f5'}}>
          <span style={{...s.summaryNum, color:'#c53030'}}>{rejectedCount}</span>
          <span style={s.summaryLabel}>Raised Error</span>
        </div>
        <div style={{...s.summaryItem, background:'#fffbeb'}}>
          <span style={{...s.summaryNum, color:'#92400e'}}>{pendingCount}</span>
          <span style={s.summaryLabel}>Pending</span>
        </div>
      </div>

      {/* Subjects grouped by category */}
      {Object.keys(grouped).map(category => (
        <div key={category} style={s.categoryBlock}>
          <div style={{...s.categoryHeader, background: categoryColors[category]||'#667eea'}}>
            {categoryLabels[category] || category}
            <span style={s.categoryCount}>{grouped[category].length} subjects</span>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Course Code</th>
                <th style={s.th}>Nomenclature of Paper</th>
                <th style={s.th}>Credits</th>
                <th style={s.th}>Int. Marks</th>
                <th style={s.th}>End Term</th>
                <th style={s.th}>Total</th>
                {category === 'MAJOR' && <th style={s.th}>Mark as Major</th>}
                <th style={s.th}>Your Decision</th>
                <th style={s.th}>Remarks (if error)</th>
              </tr>
            </thead>
            <tbody>
              {grouped[category].map(sub => {
                const enroll = enrollments[sub.subject_id] || { status:'PENDING', is_major:false, remarks:'' };
                return (
                  <tr key={sub.subject_id} style={{
                    background: enroll.status==='ACCEPTED'?'#f0fff4':enroll.status==='REJECTED'?'#fff5f5':'#fff',
                    transition: 'background 0.2s'
                  }}>
                    <td style={{...s.td, fontFamily:'monospace', fontWeight:'600'}}>{sub.subject_code}</td>
                    <td style={s.td}>{sub.subject_name}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.credits}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.internal_marks||'-'}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.end_term_marks||'-'}</td>
                    <td style={{...s.td, textAlign:'center', fontWeight:'700'}}>{sub.total_marks||'-'}</td>
                    {category === 'MAJOR' && (
                      <td style={{...s.td, textAlign:'center'}}>
                        <input
                          type="checkbox"
                          checked={enroll.is_major || false}
                          onChange={e => updateEnrollment(sub.subject_id, 'is_major', e.target.checked)}
                          disabled={submitted || enroll.status !== 'ACCEPTED'}
                          style={{width:'18px', height:'18px', cursor:'pointer'}}
                        />
                      </td>
                    )}
                    <td style={{...s.td, textAlign:'center'}}>
                      {submitted ? (
                        <span style={{
                          ...s.statusBadge,
                          background: enroll.status==='ACCEPTED'?'#48bb78':enroll.status==='REJECTED'?'#e53e3e':'#ed8936'
                        }}>
                          {enroll.status==='ACCEPTED'?'✅ Accepted':enroll.status==='REJECTED'?'❌ Error Raised':'⏳ Pending'}
                        </span>
                      ) : (
                        <div style={s.btnGroup}>
                          <button
                            style={{...s.acceptBtn, opacity: enroll.status==='ACCEPTED'?1:0.5}}
                            onClick={() => updateEnrollment(sub.subject_id, 'status', 'ACCEPTED')}>
                            ✅ Accept
                          </button>
                          <button
                            style={{...s.rejectBtn, opacity: enroll.status==='REJECTED'?1:0.5}}
                            onClick={() => updateEnrollment(sub.subject_id, 'status', 'REJECTED')}>
                            ❌ Error
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={s.td}>
                      {submitted ? (
                        <span style={{color:'#718096', fontSize:'0.85rem'}}>{enroll.remarks || '-'}</span>
                      ) : (
                        <input
                          style={s.remarksInput}
                          placeholder="Describe the error..."
                          value={enroll.remarks || ''}
                          onChange={e => updateEnrollment(sub.subject_id, 'remarks', e.target.value)}
                          disabled={enroll.status !== 'REJECTED'}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Submit Button */}
      {!submitted && subjects.length > 0 && (
        <div style={s.submitSection}>
          <div style={s.submitInfo}>
            <p>⚠️ <strong>Important:</strong> Once submitted, you cannot change your enrollment. Make sure all decisions are correct.</p>
            <p>📌 Remaining decisions: <strong style={{color: pendingCount>0?'#c53030':'#276749'}}>{pendingCount} subjects</strong></p>
          </div>
          <button
            style={{...s.submitBtn, opacity: submitting?0.6:1}}
            onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? '⏳ Submitting...' : '🚀 Submit Enrollment'}
          </button>
        </div>
      )}

      {subjects.length === 0 && (
        <div style={s.emptyState}>
          📭 No subjects found for your programme and semester. Please contact admin.
        </div>
      )}
    </div>
  );
}

const s = {
  container: { minHeight:'100vh', background:'#f0f4f8', padding:'1.5rem' },
  loading: { padding:'3rem', textAlign:'center', fontSize:'1.2rem', color:'#718096' },
  header: { display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem', background:'#fff', padding:'1rem 1.5rem', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  backBtn: { padding:'0.5rem 1rem', background:'#4c51bf', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' },
  headerTitle: { margin:0, color:'#2d3748' },
  headerSub: { margin:'0.25rem 0 0', color:'#718096', fontSize:'0.9rem' },
  msg: { padding:'0.75rem 1.5rem', borderRadius:'8px', marginBottom:'1rem', fontWeight:'600' },
  submittedBanner: { background:'#c6f6d5', color:'#276749', padding:'1rem 1.5rem', borderRadius:'8px', marginBottom:'1rem', fontWeight:'600' },
  infoBanner: { background:'#ebf8ff', color:'#2b6cb0', padding:'1rem 1.5rem', borderRadius:'8px', marginBottom:'1rem', border:'1px solid #90cdf4' },
  summaryBar: { display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  summaryItem: { flex:1, minWidth:'100px', padding:'1rem', borderRadius:'10px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' },
  summaryNum: { fontSize:'2rem', fontWeight:'700', color:'#2d3748' },
  summaryLabel: { fontSize:'0.8rem', color:'#718096', marginTop:'0.25rem' },
  categoryBlock: { marginBottom:'2rem', borderRadius:'10px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  categoryHeader: { padding:'0.75rem 1.5rem', color:'#fff', fontWeight:'700', display:'flex', justifyContent:'space-between', alignItems:'center' },
  categoryCount: { background:'rgba(255,255,255,0.3)', padding:'0.2rem 0.75rem', borderRadius:'999px', fontSize:'0.85rem' },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff' },
  th: { background:'#4a5568', color:'#fff', padding:'0.75rem 1rem', textAlign:'left', fontSize:'0.8rem', fontWeight:'600', borderRight:'1px solid #718096' },
  td: { padding:'0.75rem 1rem', borderBottom:'1px solid #e2e8f0', fontSize:'0.85rem', verticalAlign:'middle' },
  btnGroup: { display:'flex', gap:'0.5rem', justifyContent:'center' },
  acceptBtn: { padding:'0.4rem 0.75rem', background:'#48bb78', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' },
  rejectBtn: { padding:'0.4rem 0.75rem', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'600', fontSize:'0.8rem' },
  statusBadge: { padding:'0.3rem 0.75rem', borderRadius:'999px', color:'#fff', fontSize:'0.8rem', fontWeight:'600' },
  remarksInput: { padding:'0.4rem 0.6rem', borderRadius:'5px', border:'1px solid #cbd5e0', fontSize:'0.8rem', width:'100%', boxSizing:'border-box' },
  submitSection: { background:'#fff', padding:'1.5rem', borderRadius:'12px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', flexWrap:'wrap', gap:'1rem' },
  submitInfo: { color:'#4a5568', fontSize:'0.9rem' },
  submitBtn: { padding:'1rem 3rem', background:'#4c51bf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'700', fontSize:'1.1rem' },
  emptyState: { background:'#fff', padding:'3rem', textAlign:'center', borderRadius:'12px', color:'#718096', fontSize:'1.1rem' },
};
