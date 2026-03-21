import React, { useState, useEffect } from 'react';
import API from '../api';

export default function TeacherDashboard({ teacher, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [subjects, setSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [pendingSection, setPendingSection] = useState({}); // subject_id -> section name
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');


  // Marks state
  const [marksSubject, setMarksSubject] = useState('');
  const [marksExamType, setMarksExamType] = useState('INTERNAL');
  const [marksMaxMarks, setMarksMaxMarks] = useState('');
  const [marksSemester, setMarksSemester] = useState('');
  const [classMarks, setClassMarks] = useState([]);  // enrolled students for bulk marks
  const [marksLoading, setMarksLoading] = useState(false);
  const [viewMarksSubject, setViewMarksSubject] = useState('');
  const [viewMarksRecords, setViewMarksRecords] = useState([]);

  useEffect(() => { fetchSubjects(); fetchAllSubjects(); }, []);

  const showMsg = (text, type = 'success') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const fetchSubjects = async () => {
    try {
      const r = await API.get(`/subjects/teacher/${teacher.teacher_id}`);
      setSubjects(r.data);
    } catch(e) {}
  };

  const fetchAllSubjects = async () => {
    try {
      const r = await API.get('/subjects');
      setAllSubjects(r.data);
    } catch(e) {}
  };

  const handleToggleSubject = async (subject_id, currentlyMine, section = 'A') => {
    try {
      if (currentlyMine) {
        await API.delete(`/subjects/${subject_id}/teachers/${teacher.teacher_id}`);
      } else {
        await API.post(`/subjects/${subject_id}/teachers`, { teacher_id: teacher.teacher_id, section });
      }
      await fetchSubjects();
      await fetchAllSubjects();
    } catch(e) { showMsg('Failed to update subject', 'error'); }
  };

  // ─── ATTENDANCE ───────────────────────────────────────────

  const [attSubject, setAttSubject] = useState('');
  const [attMode, setAttMode] = useState('daily');       // daily | weekly | monthly
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attWeek, setAttWeek] = useState('');            // week input value
  const [attMonth, setAttMonth] = useState(new Date().toISOString().slice(0,7));
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attGrid, setAttGrid] = useState({});            // { student_id: { date: status } }
  const [attDates, setAttDates] = useState([]);          // ordered list of dates for current view
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);

  const getDatesForMode = () => {
    if (attMode === 'daily') return attDate ? [attDate] : [];
    if (attMode === 'weekly') {
      if (!attWeek) return [];
      const [yr, wk] = attWeek.split('-W').map(Number);
      const jan4 = new Date(yr, 0, 4);
      const startOfWeek = new Date(jan4);
      startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (wk - 1) * 7);
      return Array.from({length: 7}, (_, i) => {
        const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });
    }
    if (attMode === 'monthly') {
      if (!attMonth) return [];
      const [yr, mo] = attMonth.split('-').map(Number);
      const days = new Date(yr, mo, 0).getDate();
      return Array.from({length: days}, (_, i) => {
        const d = new Date(yr, mo - 1, i + 1);
        return d.toISOString().split('T')[0];
      });
    }
    return [];
  };

  const loadRegister = async () => {
    if (!attSubject) return showMsg('Select a subject first', 'error');
    const dates = getDatesForMode();
    if (!dates.length) return showMsg('Select a date / week / month', 'error');
    setAttLoading(true);
    try {
      const enrolledRes = await API.get(`/enrollment/students/${attSubject}`);
      const enrolled = enrolledRes.data;
      if (!enrolled.length) { showMsg('No enrolled students for this subject', 'error'); setAttLoading(false); return; }

      // Fetch existing records for each date in parallel
      const existing = await Promise.all(
        dates.map(d => API.get(`/attendance/subject/${attSubject}/date/${d}`).then(r => ({ date: d, records: r.data })))
      );

      // Build grid default = PRESENT
      const grid = {};
      enrolled.forEach(s => {
        grid[s.student_id] = {};
        dates.forEach(d => { grid[s.student_id][d] = 'PRESENT'; });
      });
      existing.forEach(({ date, records }) => {
        records.forEach(r => { if (grid[r.student_id]) grid[r.student_id][date] = r.status; });
      });

      setEnrolledStudents(enrolled);
      setAttDates(dates);
      setAttGrid(grid);
    } catch(e) { showMsg('Failed to load register', 'error'); }
    finally { setAttLoading(false); }
  };

  const cycleStatus = (cur) => cur === 'PRESENT' ? 'ABSENT' : cur === 'ABSENT' ? 'LATE' : 'PRESENT';

  const setCell = (student_id, date, status) => {
    setAttGrid(prev => ({ ...prev, [student_id]: { ...prev[student_id], [date]: status } }));
  };

  const setColumnAll = (date, status) => {
    setAttGrid(prev => {
      const next = { ...prev };
      enrolledStudents.forEach(s => { next[s.student_id] = { ...next[s.student_id], [date]: status }; });
      return next;
    });
  };

  const saveRegister = async () => {
    if (!enrolledStudents.length) return;
    setAttSaving(true);
    try {
      for (const date of attDates) {
        const records = enrolledStudents.map(s => ({ student_id: s.student_id, status: attGrid[s.student_id]?.[date] || 'PRESENT' }));
        await API.post('/attendance/bulk', { subject_id: Number(attSubject), date, records });
      }
      showMsg(`Saved attendance for ${attDates.length} day(s), ${enrolledStudents.length} student(s)`);
    } catch(e) { showMsg(e.response?.data?.error || 'Error', 'error'); }
    finally { setAttSaving(false); }
  };

  // ─── MARKS ────────────────────────────────────────────────

  const loadClassForMarks = async () => {
    if (!marksSubject) return;
    setMarksLoading(true);
    try {
      const sub = subjects.find(s => String(s.subject_id) === String(marksSubject));
      setMarksSemester(sub?.semester || '');

      const [enrolledRes, existingRes] = await Promise.all([
        API.get(`/enrollment/students/${marksSubject}`),
        API.get(`/marks/subject/${marksSubject}`)
      ]);
      const existingMap = {};
      existingRes.data.filter(m => m.exam_type === marksExamType)
        .forEach(m => { existingMap[m.student_id] = m.marks_obtained; });

      setClassMarks(enrolledRes.data.map(s => ({
        student_id: s.student_id,
        name: s.name,
        roll_no: s.roll_no,
        marks: existingMap[s.student_id] !== undefined ? String(existingMap[s.student_id]) : '',
      })));
    } catch(e) { showMsg('Failed to load students', 'error'); }
    finally { setMarksLoading(false); }
  };

  useEffect(() => {
    if (marksSubject) loadClassForMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksSubject, marksExamType]);

  const handleBulkMarks = async () => {
    if (!marksSubject || !marksMaxMarks) return showMsg('Select subject and set max marks', 'error');
    const toSave = classMarks.filter(s => s.marks !== '' && s.marks !== null);
    if (toSave.length === 0) return showMsg('No marks entered', 'error');
    try {
      for (const s of toSave) {
        await API.post('/marks', {
          student_id: s.student_id,
          subject_id: Number(marksSubject),
          exam_type: marksExamType,
          marks_obtained: Number(s.marks),
          max_marks: Number(marksMaxMarks),
          semester: Number(marksSemester),
        });
      }
      showMsg(`Marks saved for ${toSave.length} students`);
    } catch(e) { showMsg(e.response?.data?.error || 'Error', 'error'); }
  };

  const loadViewMarks = async () => {
    if (!viewMarksSubject) return;
    try {
      const r = await API.get(`/marks/subject/${viewMarksSubject}`);
      setViewMarksRecords(r.data);
    } catch(e) { showMsg('Failed to load marks', 'error'); }
  };

  useEffect(() => {
    if (viewMarksSubject) loadViewMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMarksSubject]);

  const msgStyle = {
    ...styles.msg,
    background: msgType === 'error' ? '#fff5f5' : '#c6f6d5',
    color: msgType === 'error' ? '#c53030' : '#276749',
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h2 style={styles.navTitle}>🎓 College ERP — Teacher Panel</h2>
        <div style={styles.navRight}>
          <span style={styles.teacherName}>👤 {teacher.name} &nbsp;|&nbsp; {teacher.department}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.tabs}>
        {['overview', 'attendance', 'marks'].map(tab => (
          <button key={tab}
            style={{...styles.tab, ...(activeTab === tab ? styles.activeTab : {})}}
            onClick={() => { setActiveTab(tab); setMsg(''); }}>
            {tab === 'overview' ? '🏠 Overview' : tab === 'attendance' ? '📅 Attendance' : '📝 Marks'}
          </button>
        ))}
      </div>

      {msg && <div style={msgStyle}>{msg}</div>}

      <div style={styles.content}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div>
            <div style={styles.welcome}>
              <h2 style={{margin:0}}>Welcome, {teacher.name}! 👋</h2>
              <p style={styles.meta}>Department: {teacher.department} &nbsp;|&nbsp; {teacher.email}</p>
            </div>
            <div style={styles.cards}>
              <div style={{...styles.card, background:'#667eea'}}>
                <div style={styles.cardIcon}>📚</div>
                <div style={styles.cardNum}>{subjects.length}</div>
                <div>My Subjects</div>
              </div>
              <div style={{...styles.card, background:'#48bb78'}}>
                <div style={styles.cardIcon}>🎓</div>
                <div style={styles.cardNum}>{[...new Set(subjects.map(s => s.programme_name).filter(Boolean))].length || '—'}</div>
                <div>Programmes</div>
              </div>
              <div style={{...styles.card, background:'#ed8936'}}>
                <div style={styles.cardIcon}>📖</div>
                <div style={styles.cardNum}>{[...new Set(subjects.map(s => s.semester).filter(Boolean))].length}</div>
                <div>Semesters</div>
              </div>
            </div>

            {/* My Subjects list */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2rem', marginBottom:'1rem'}}>
              <h3 style={{margin:0}}>My Subjects ({subjects.length})</h3>
              <button style={{...styles.addBtn, background: showSubjectPicker ? '#718096' : '#805ad5'}}
                onClick={() => { setShowSubjectPicker(!showSubjectPicker); setSubjectSearch(''); }}>
                {showSubjectPicker ? '✕ Close' : '➕ Add / Remove Subjects'}
              </button>
            </div>

            <table style={styles.table}>
              <thead><tr>{['Code','Subject','Category','Programme','Sem','Section','Remove'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{subjects.length === 0
                ? <tr><td colSpan={7} style={{...styles.td,textAlign:'center',color:'#a0aec0',padding:'2rem'}}>
                    No subjects added yet. Click "Add / Remove Subjects" to select yours.
                  </td></tr>
                : subjects.map(s => (
                  <tr key={s.subject_id}>
                    <td style={styles.td}><strong>{s.subject_code}</strong></td>
                    <td style={styles.td}>{s.subject_name}</td>
                    <td style={styles.td}><span style={{...styles.badge,background:'#9f7aea'}}>{s.category}</span></td>
                    <td style={styles.td}>{s.programme_name||'—'}</td>
                    <td style={styles.td}>{s.semester}</td>
                    <td style={styles.td}><span style={{...styles.badge,background:'#4c51bf'}}>{s.section||'A'}</span></td>
                    <td style={styles.td}>
                      <button style={{...styles.smallBtn, background:'#fed7d7', color:'#c53030'}}
                        onClick={() => handleToggleSubject(s.subject_id, true)}>✕ Remove</button>
                    </td>
                  </tr>
                ))
              }</tbody>
            </table>

            {/* Subject picker */}
            {showSubjectPicker && (
              <div style={{marginTop:'1.5rem', background:'#fff', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                <h4 style={{margin:'0 0 1rem', color:'#2d3748'}}>All Available Subjects — check to add to your list</h4>
                <input style={{...styles.input, width:'100%', marginBottom:'1rem', boxSizing:'border-box'}}
                  placeholder="Search by code or name…"
                  value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} />
                {[1,2,3,4,5,6,7,8].map(sem => {
                  const semSubjects = allSubjects.filter(s =>
                    s.semester === sem &&
                    (s.subject_code.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                     s.subject_name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                     subjectSearch === '')
                  );
                  if (!semSubjects.length) return null;
                  return (
                    <div key={sem} style={{marginBottom:'1.25rem'}}>
                      <h5 style={{color:'#4a5568', marginBottom:'0.4rem', fontSize:'0.85rem', textTransform:'uppercase', letterSpacing:'0.05em'}}>Semester {sem}</h5>
                      <table style={styles.table}>
                        <thead><tr>{['','Code','Subject','Category','Programme','Section'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                        <tbody>{semSubjects.map(s => {
                          const mine = subjects.find(ms => ms.subject_id === s.subject_id);
                          const sec = pendingSection[s.subject_id] ?? (mine?.section || 'A');
                          return (
                            <tr key={s.subject_id} style={{background: mine ? '#f0fff4' : ''}}>
                              <td style={{...styles.td, width:'40px', textAlign:'center'}}>
                                <input type="checkbox" checked={!!mine}
                                  onChange={() => handleToggleSubject(s.subject_id, !!mine, sec)} />
                              </td>
                              <td style={styles.td}><strong>{s.subject_code}</strong></td>
                              <td style={styles.td}>{s.subject_name}</td>
                              <td style={styles.td}><span style={{...styles.badge, background:'#9f7aea'}}>{s.category}</span></td>
                              <td style={styles.td}>{s.programme_name || <span style={{color:'#a0aec0'}}>Common</span>}</td>
                              <td style={styles.td}>
                                <input
                                  style={{...styles.input, width:'70px', padding:'0.25rem 0.5rem', fontSize:'0.8rem'}}
                                  placeholder="A"
                                  value={sec}
                                  onChange={e => setPendingSection(p => ({...p, [s.subject_id]: e.target.value}))}
                                  title="Section name e.g. A, B, Morning, Evening"
                                />
                              </td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {activeTab === 'attendance' && (
          <div>
            {/* Controls */}
            <div style={{...styles.section, marginBottom:'1.5rem'}}>
              <div style={{display:'flex', flexWrap:'wrap', gap:'0.75rem', alignItems:'flex-end'}}>
                <div>
                  <div style={styles.fieldLabel}>Subject</div>
                  <select style={styles.input} value={attSubject}
                    onChange={e => { setAttSubject(e.target.value); setEnrolledStudents([]); setAttDates([]); }}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_code} — {s.subject_name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={styles.fieldLabel}>Mode</div>
                  <div style={{display:'flex', gap:'0.4rem'}}>
                    {['daily','weekly','monthly'].map(m => (
                      <button key={m} onClick={() => { setAttMode(m); setEnrolledStudents([]); setAttDates([]); }}
                        style={{...styles.smallBtn, padding:'0.5rem 1rem', fontSize:'0.85rem',
                          background: attMode===m ? '#276749' : '#e2e8f0',
                          color: attMode===m ? '#fff' : '#4a5568', borderRadius:'6px'}}>
                        {m[0].toUpperCase()+m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={styles.fieldLabel}>{attMode==='daily'?'Date':attMode==='weekly'?'Week':'Month'}</div>
                  {attMode==='daily' && <input style={styles.input} type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} />}
                  {attMode==='weekly' && <input style={styles.input} type="week" value={attWeek} onChange={e=>setAttWeek(e.target.value)} />}
                  {attMode==='monthly' && <input style={styles.input} type="month" value={attMonth} onChange={e=>setAttMonth(e.target.value)} />}
                </div>
                <button style={{...styles.addBtn, alignSelf:'flex-end'}} onClick={loadRegister} disabled={attLoading}>
                  {attLoading ? 'Loading…' : 'Load Register'}
                </button>
                {enrolledStudents.length > 0 && (
                  <button style={{...styles.addBtn, alignSelf:'flex-end', background: attSaving?'#718096':'#2b6cb0'}}
                    onClick={saveRegister} disabled={attSaving}>
                    {attSaving ? 'Saving…' : `💾 Save (${attDates.length} day${attDates.length>1?'s':''})`}
                  </button>
                )}
              </div>
            </div>

            {/* Legend */}
            {enrolledStudents.length > 0 && (
              <div style={{display:'flex', gap:'1rem', marginBottom:'0.75rem', fontSize:'0.82rem', flexWrap:'wrap', alignItems:'center'}}>
                <span style={{fontWeight:600, color:'#4a5568'}}>{enrolledStudents.length} students &nbsp;·&nbsp; click cell to cycle P → A → L</span>
                <span style={{...styles.badge, background:'#48bb78'}}>P = Present</span>
                <span style={{...styles.badge, background:'#e53e3e'}}>A = Absent</span>
                <span style={{...styles.badge, background:'#ed8936'}}>L = Late</span>
              </div>
            )}

            {/* Register Grid */}
            {enrolledStudents.length > 0 && (
              <div style={{overflowX:'auto'}}>
                <table style={{...styles.table, minWidth: `${300 + attDates.length * 52}px`}}>
                  <thead>
                    <tr>
                      <th style={{...styles.th, position:'sticky', left:0, zIndex:2, minWidth:'60px'}}>Roll No</th>
                      <th style={{...styles.th, position:'sticky', left:'60px', zIndex:2, minWidth:'160px'}}>Name</th>
                      {attDates.map(d => {
                        const day = new Date(d+'T00:00:00');
                        const isSun = day.getDay() === 0;
                        return (
                          <th key={d} style={{...styles.th, textAlign:'center', minWidth:'52px', background: isSun?'#553c9a':'#276749'}}>
                            <div style={{fontSize:'0.7rem'}}>{day.toLocaleDateString('en',{weekday:'short'})}</div>
                            <div style={{fontSize:'0.75rem'}}>{day.getDate()}</div>
                            <div style={{display:'flex', gap:'2px', justifyContent:'center', marginTop:'3px'}}>
                              <button onClick={()=>setColumnAll(d,'PRESENT')} title="All Present"
                                style={{...styles.smallBtn, padding:'1px 4px', fontSize:'0.65rem', background:'#48bb78'}}>P</button>
                              <button onClick={()=>setColumnAll(d,'ABSENT')} title="All Absent"
                                style={{...styles.smallBtn, padding:'1px 4px', fontSize:'0.65rem', background:'#e53e3e'}}>A</button>
                            </div>
                          </th>
                        );
                      })}
                      <th style={{...styles.th, textAlign:'center', minWidth:'60px'}}>Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map(s => {
                      const presentCount = attDates.filter(d => attGrid[s.student_id]?.[d] === 'PRESENT').length;
                      const pct = attDates.length ? Math.round(presentCount/attDates.length*100) : 0;
                      return (
                        <tr key={s.student_id}>
                          <td style={{...styles.td, position:'sticky', left:0, background:'#fff', fontWeight:700, zIndex:1}}>{s.roll_no}</td>
                          <td style={{...styles.td, position:'sticky', left:'60px', background:'#fff', zIndex:1}}>{s.name}</td>
                          {attDates.map(d => {
                            const st = attGrid[s.student_id]?.[d] || 'PRESENT';
                            const bg = st==='PRESENT'?'#48bb78':st==='ABSENT'?'#e53e3e':'#ed8936';
                            return (
                              <td key={d} style={{...styles.td, textAlign:'center', padding:'0.3rem', cursor:'pointer'}}
                                onClick={() => setCell(s.student_id, d, cycleStatus(st))}>
                                <span style={{...styles.badge, background:bg, fontSize:'0.72rem', cursor:'pointer'}}>{st[0]}</span>
                              </td>
                            );
                          })}
                          <td style={{...styles.td, textAlign:'center'}}>
                            <span style={{...styles.badge, background:pct>=75?'#48bb78':pct>=50?'#ed8936':'#e53e3e'}}>
                              {presentCount}/{attDates.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!enrolledStudents.length && !attLoading && (
              <div style={{textAlign:'center', color:'#a0aec0', padding:'3rem', background:'#fff', borderRadius:'12px'}}>
                Select a subject and period, then click <strong>Load Register</strong>
              </div>
            )}
          </div>
        )}

        {/* ── MARKS ── */}
        {activeTab === 'marks' && (
          <div style={styles.twoCol}>

            {/* Enter Marks */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>✏️ Enter Class Marks</h3>
              <div style={styles.form}>
                <select style={styles.input} value={marksSubject} onChange={e => setMarksSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_code} — {s.subject_name}</option>)}
                </select>
                <select style={styles.input} value={marksExamType} onChange={e => setMarksExamType(e.target.value)}>
                  <option value="INTERNAL">Internal</option>
                  <option value="EXTERNAL">External</option>
                  <option value="PRACTICAL">Practical</option>
                </select>
                <input style={styles.input} type="number" placeholder="Max Marks" value={marksMaxMarks} onChange={e => setMarksMaxMarks(e.target.value)} />
              </div>

              {marksLoading && <p style={{color:'#a0aec0'}}>Loading students…</p>}
              {classMarks.length > 0 && (
                <>
                  <div style={{maxHeight:'360px',overflowY:'auto',marginBottom:'1rem'}}>
                    <table style={styles.table}>
                      <thead><tr>{['Roll No','Name','Marks'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                      <tbody>{classMarks.map((s,i) => (
                        <tr key={s.student_id}>
                          <td style={styles.td}>{s.roll_no}</td>
                          <td style={styles.td}>{s.name}</td>
                          <td style={styles.td}>
                            <input type="number" style={{...styles.input,minWidth:'80px',padding:'0.3rem 0.5rem'}}
                              placeholder="—" value={s.marks}
                              onChange={e => {
                                const updated = [...classMarks];
                                updated[i] = {...s, marks: e.target.value};
                                setClassMarks(updated);
                              }} />
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <button style={{...styles.addBtn,width:'100%'}} onClick={handleBulkMarks}>Save Marks</button>
                </>
              )}
              {marksSubject && !marksLoading && classMarks.length === 0 && (
                <p style={{color:'#a0aec0',textAlign:'center'}}>No students found</p>
              )}
            </div>

            {/* View Marks */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📊 View Class Marks</h3>
              <div style={styles.form}>
                <select style={styles.input} value={viewMarksSubject} onChange={e => setViewMarksSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_code} — {s.subject_name}</option>)}
                </select>
              </div>
              {viewMarksRecords.length > 0
                ? <table style={styles.table}>
                    <thead><tr>{['Roll No','Name','Exam','Marks','Max','%'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                    <tbody>{viewMarksRecords.map(m => {
                      const pct = Math.round(m.marks_obtained / m.max_marks * 100);
                      return (
                        <tr key={m.mark_id}>
                          <td style={styles.td}>{m.roll_no}</td>
                          <td style={styles.td}>{m.name}</td>
                          <td style={styles.td}><span style={{...styles.badge,background:'#9f7aea'}}>{m.exam_type}</span></td>
                          <td style={styles.td}><strong>{m.marks_obtained}</strong></td>
                          <td style={styles.td}>{m.max_marks}</td>
                          <td style={styles.td}>
                            <span style={{...styles.badge,background:pct>=60?'#48bb78':pct>=40?'#ed8936':'#e53e3e'}}>{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                : <p style={{color:'#a0aec0',textAlign:'center',marginTop:'2rem'}}>Select a subject to view marks</p>
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:'100vh', background:'#f0f4f8' },
  nav: { background:'#276749', padding:'1rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center' },
  navTitle: { color:'#fff', margin:0 },
  navRight: { display:'flex', alignItems:'center', gap:'1rem' },
  teacherName: { color:'#c6f6d5', fontSize:'0.9rem' },
  logoutBtn: { background:'#e53e3e', color:'#fff', border:'none', padding:'0.5rem 1rem', borderRadius:'6px', cursor:'pointer' },
  tabs: { display:'flex', background:'#fff', borderBottom:'2px solid #e2e8f0', padding:'0 2rem' },
  tab: { padding:'1rem 1.5rem', border:'none', background:'none', cursor:'pointer', fontSize:'0.95rem', color:'#718096' },
  activeTab: { color:'#38a169', borderBottom:'2px solid #38a169', fontWeight:'600' },
  content: { padding:'2rem' },
  msg: { padding:'0.75rem 2rem', fontWeight:'600' },
  welcome: { background:'#fff', padding:'1.5rem 2rem', borderRadius:'12px', marginBottom:'2rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  meta: { color:'#718096', marginTop:'0.5rem', margin:0 },
  cards: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'1.5rem', marginBottom:'1rem' },
  card: { padding:'1.5rem', borderRadius:'12px', color:'#fff', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', textAlign:'center' },
  cardIcon: { fontSize:'1.8rem', marginBottom:'0.5rem' },
  cardNum: { fontSize:'2.5rem', fontWeight:'700', margin:'0.25rem 0' },
  twoCol: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(420px, 1fr))', gap:'1.5rem' },
  section: { background:'#fff', padding:'1.5rem', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  sectionTitle: { margin:'0 0 1rem', color:'#2d3748', borderBottom:'2px solid #e2e8f0', paddingBottom:'0.5rem' },
  form: { display:'flex', flexWrap:'wrap', gap:'0.75rem', marginBottom:'1rem' },
  input: { padding:'0.6rem 0.9rem', borderRadius:'6px', border:'1px solid #cbd5e0', fontSize:'0.9rem', minWidth:'160px' },
  addBtn: { padding:'0.6rem 1.4rem', background:'#38a169', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' },
  smallBtn: { padding:'0.2rem 0.6rem', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'600' },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', borderRadius:'10px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  th: { background:'#276749', color:'#fff', padding:'0.65rem 1rem', textAlign:'left', fontSize:'0.85rem' },
  td: { padding:'0.6rem 1rem', borderBottom:'1px solid #e2e8f0', fontSize:'0.85rem' },
  badge: { padding:'0.2rem 0.6rem', borderRadius:'999px', color:'#fff', fontSize:'0.75rem', fontWeight:'600' },
  fieldLabel: { fontSize:'0.78rem', fontWeight:'600', color:'#4a5568', marginBottom:'0.3rem' },
};
