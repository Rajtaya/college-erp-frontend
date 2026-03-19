import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';

export default function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState('levels');
  const [levels, setLevels] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [marks, setMarks] = useState([]);
  const [form, setForm] = useState({});

  // Student form selectors
  const [studentLevel, setStudentLevel] = useState('');
  const [studentFaculty, setStudentFaculty] = useState('');
  const [studentProgrammes, setStudentProgrammes] = useState([]);

  // Subject form selectors
  const [subjectLevel, setSubjectLevel] = useState('');
  const [subjectFaculty, setSubjectFaculty] = useState('');
  const [subjectProgrammes, setSubjectProgrammes] = useState([]);

  // Subject filters
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProgrammes, setFilterProgrammes] = useState([]);

  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [importing, setImporting] = useState(false);
  const studentFileRef = useRef();
  const teacherFileRef = useRef();
  const subjectFileRef = useRef();
  const feeFileRef = useRef();

  useEffect(() => {
    fetchLevels();
    fetchFaculties();
    fetchProgrammes();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'teachers') fetchTeachers();
    if (activeTab === 'subjects') { fetchSubjects(); fetchProgrammes(); }
    if (activeTab === 'attendance') fetchAttendance();
    if (activeTab === 'fees') { fetchFees(); fetchStudents(); }
    if (activeTab === 'marks') fetchAllMarks();
  }, [activeTab]);

  // Student form - filter programmes by level + faculty
  useEffect(() => {
    if (studentLevel && studentFaculty) {
      const filtered = programmes.filter(p =>
        String(p.level_id) === String(studentLevel) &&
        String(p.faculty_id) === String(studentFaculty)
      );
      setStudentProgrammes(filtered);
    } else {
      setStudentProgrammes([]);
    }
  }, [studentLevel, studentFaculty, programmes]);

  // Subject form - filter programmes by level + faculty
  useEffect(() => {
    if (subjectLevel && subjectFaculty) {
      const filtered = programmes.filter(p =>
        String(p.level_id) === String(subjectLevel) &&
        String(p.faculty_id) === String(subjectFaculty)
      );
      setSubjectProgrammes(filtered);
    } else {
      setSubjectProgrammes([]);
    }
  }, [subjectLevel, subjectFaculty, programmes]);

  // Filter box - filter programmes by level + faculty
  useEffect(() => {
    if (filterLevel && filterFaculty) {
      const filtered = programmes.filter(p =>
        String(p.level_id) === String(filterLevel) &&
        String(p.faculty_id) === String(filterFaculty)
      );
      setFilterProgrammes(filtered);
    } else if (filterLevel) {
      setFilterProgrammes(programmes.filter(p => String(p.level_id) === String(filterLevel)));
    } else {
      setFilterProgrammes([]);
      setFilterProgramme('');
    }
  }, [filterLevel, filterFaculty, programmes]);

  const fetchLevels = async () => { try { const r = await API.get('/levels'); setLevels(r.data); } catch(e){} };
  const fetchFaculties = async () => { try { const r = await API.get('/faculties'); setFaculties(r.data); } catch(e){} };
  const fetchProgrammes = async () => { try { const r = await API.get('/programmes'); setProgrammes(r.data); } catch(e){} };
  const fetchStudents = async () => { try { const r = await API.get('/admin/students'); setStudents(r.data); } catch(e){} };
  const fetchTeachers = async () => { try { const r = await API.get('/admin/teachers'); setTeachers(r.data); } catch(e){} };
  const fetchSubjects = async () => { try { const r = await API.get('/subjects'); setSubjects(r.data); } catch(e){} };
  const fetchAttendance = async () => { try { const r = await API.get('/admin/attendance'); setAttendance(r.data); } catch(e){} };
  const fetchFees = async () => { try { const r = await API.get('/admin/fees'); setFees(r.data); } catch(e){} };
  const fetchAllMarks = async () => { try { const r = await API.get('/admin/marks'); setMarks(r.data); } catch(e){} };

  const showMsg = (text, type = 'success') => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 4000); };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await API.delete(`/admin/${type}/${id}`);
      showMsg('Deleted successfully!');
      if (type === 'students') fetchStudents();
      if (type === 'teachers') fetchTeachers();
      if (type === 'subjects') fetchSubjects();
    } catch(e) { showMsg('Delete failed!', 'error'); }
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    try { await API.post('/faculties', form); showMsg('Faculty added!'); setForm({}); fetchFaculties(); }
    catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddLevel = async (e) => {
    e.preventDefault();
    try { await API.post('/levels', form); showMsg('Level added!'); setForm({}); fetchLevels(); }
    catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddProgramme = async (e) => {
    e.preventDefault();
    try { await API.post('/programmes', form); showMsg('Programme added!'); setForm({}); fetchProgrammes(); }
    catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await API.post('/students', { ...form, level_id: studentLevel, faculty_id: studentFaculty });
      showMsg('Student added!');
      setForm({}); setStudentLevel(''); setStudentFaculty('');
      fetchStudents();
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try { await API.post('/admin/teachers', form); showMsg('Teacher added!'); setForm({}); fetchTeachers(); }
    catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      await API.post('/subjects', { ...form, level_id: subjectLevel, faculty_id: subjectFaculty });
      showMsg('Subject added!');
      setForm({}); setSubjectLevel(''); setSubjectFaculty('');
      fetchSubjects();
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleAddFee = async (e) => {
    e.preventDefault();
    try { await API.post('/fees', form); showMsg('Fee record added!'); setForm({}); fetchFees(); }
    catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const handleMarkPaid = async (fee_id) => {
    try { await API.put(`/fees/pay/${fee_id}`); showMsg('Fee marked as paid!'); fetchFees(); }
    catch (err) { showMsg(err.response?.data?.error || 'Error', 'error'); }
  };

  const downloadTemplate = (type) => {
    const templates = {
      students: [{ roll_no: 'CS001', name: 'Rahul Sharma', email: 'rahul@college.com', phone: '9876543210', level_name: 'UG', faculty_name: 'Science', programme_name: 'B.Sc Computer Science', semester: 1, year: 1, password: 'password123' }],
      teachers: [{ name: 'Dr. Sharma', email: 'sharma@college.com', phone: '9876543211', department: 'Computer Science', password: 'teacher123' }],
      subjects: [{ subject_code: 'CS101', subject_name: 'Intro to Programming', category: 'MAJOR', semester: 1, credits: 4, level_name: 'UG', faculty_name: 'Science', programme_name: 'B.Sc Computer Science' }],
      fees: [{ roll_no: 'CS001', amount: 15000, fee_type: 'Tuition Fee', due_date: '2026-04-01' }],
    };
    const ws = XLSX.utils.json_to_sheet(templates[type]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, `${type}_template.xlsx`);
  };

  const handleImportStudents = async (e) => {
    const file = e.target.files[0]; if (!file) return; setImporting(true);
    try {
      const data = await file.arrayBuffer(); const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const levelMap = {}; levels.forEach(l => { levelMap[l.level_name.toUpperCase()] = l.level_id; });
      const progMap = {}; programmes.forEach(p => { progMap[p.programme_name.toLowerCase()] = p.programme_id; });
      const facMap = {}; faculties.forEach(f => { facMap[f.faculty_name.toLowerCase()] = f.faculty_id; });
      let success = 0, failed = 0;
      for (const row of rows) {
        try {
          await API.post('/students', {
            roll_no: String(row.roll_no||''), name: String(row.name||''), email: String(row.email||''),
            phone: String(row.phone||''), course: String(row.programme_name||''),
            semester: Number(row.semester||1), year: Number(row.year||1),
            password: String(row.password||'password123'),
            level_id: levelMap[String(row.level_name||'').toUpperCase()] || null,
            programme_id: progMap[String(row.programme_name||'').toLowerCase()] || null,
            faculty_id: facMap[String(row.faculty_name||'').toLowerCase()] || null,
          });
          success++;
        } catch { failed++; }
      }
      showMsg(`✅ Imported ${success} students${failed ? `, ❌ ${failed} failed` : ''}`, failed ? 'warning' : 'success');
      fetchStudents();
    } catch { showMsg('Failed!', 'error'); } finally { setImporting(false); e.target.value = ''; }
  };

  const handleImportTeachers = async (e) => {
    const file = e.target.files[0]; if (!file) return; setImporting(true);
    try {
      const data = await file.arrayBuffer(); const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      let success = 0, failed = 0;
      for (const row of rows) {
        try { await API.post('/admin/teachers', { name: String(row.name||''), email: String(row.email||''), phone: String(row.phone||''), department: String(row.department||''), password: String(row.password||'teacher123') }); success++; }
        catch { failed++; }
      }
      showMsg(`✅ Imported ${success} teachers${failed ? `, ❌ ${failed} failed` : ''}`, failed ? 'warning' : 'success');
      fetchTeachers();
    } catch { showMsg('Failed!', 'error'); } finally { setImporting(false); e.target.value = ''; }
  };

  const handleImportSubjects = async (e) => {
    const file = e.target.files[0]; if (!file) return; setImporting(true);
    try {
      const data = await file.arrayBuffer(); const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const validCategories = ['MAJOR','MINOR','VAC','SEC','MDC','AEC'];
      const levelMap = {}; levels.forEach(l => { levelMap[l.level_name.toUpperCase()] = l.level_id; });
      const progMap = {}; programmes.forEach(p => { progMap[p.programme_name.toLowerCase()] = p.programme_id; });
      const facMap = {}; faculties.forEach(f => { facMap[f.faculty_name.toLowerCase()] = f.faculty_id; });
      let success = 0, failed = 0;
      for (const row of rows) {
        try {
          const category = String(row.category||'').toUpperCase();
          if (!validCategories.includes(category)) { failed++; continue; }
          await API.post('/subjects', {
            subject_code: String(row.subject_code||''), subject_name: String(row.subject_name||''),
            category, semester: Number(row.semester||1), credits: Number(row.credits||3),
            level_id: levelMap[String(row.level_name||'').toUpperCase()] || null,
            programme_id: progMap[String(row.programme_name||'').toLowerCase()] || null,
            faculty_id: facMap[String(row.faculty_name||'').toLowerCase()] || null,
          });
          success++;
        } catch { failed++; }
      }
      showMsg(`✅ Imported ${success} subjects${failed ? `, ❌ ${failed} failed` : ''}`, failed ? 'warning' : 'success');
      fetchSubjects();
    } catch { showMsg('Failed!', 'error'); } finally { setImporting(false); e.target.value = ''; }
  };

  const handleImportFees = async (e) => {
    const file = e.target.files[0]; if (!file) return; setImporting(true);
    try {
      const data = await file.arrayBuffer(); const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const studentMap = {}; students.forEach(s => { studentMap[s.roll_no] = s.student_id; });
      let success = 0, failed = 0, notFound = [];
      for (const row of rows) {
        try {
          const student_id = studentMap[String(row.roll_no||'').trim()];
          if (!student_id) { failed++; notFound.push(row.roll_no); continue; }
          await API.post('/fees', { student_id, amount: Number(row.amount||0), fee_type: String(row.fee_type||'Tuition Fee'), due_date: String(row.due_date||'') });
          success++;
        } catch { failed++; }
      }
      let m = `✅ Imported ${success} fee records${failed ? `, ❌ ${failed} failed` : ''}`;
      if (notFound.length) m += `. Not found: ${notFound.join(', ')}`;
      showMsg(m, failed ? 'warning' : 'success');
      fetchFees();
    } catch { showMsg('Failed!', 'error'); } finally { setImporting(false); e.target.value = ''; }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchLevel = !filterLevel || String(s.level_id) === String(filterLevel);
    const matchFaculty = !filterFaculty || String(s.faculty_id) === String(filterFaculty);
    const matchProgramme = !filterProgramme || String(s.programme_id) === String(filterProgramme);
    const matchCategory = !filterCategory || s.category === filterCategory;
    return matchLevel && matchFaculty && matchProgramme && matchCategory;
  });

  const facultyColors = { 'Arts': '#9f7aea', 'Science': '#48bb78', 'Commerce': '#ed8936' };
  const tabs = ['levels', 'students', 'teachers', 'subjects', 'attendance', 'fees', 'marks'];
  const msgStyle = { ...styles.msg, background: msgType==='error'?'#fff5f5':msgType==='warning'?'#fffbeb':'#c6f6d5', color: msgType==='error'?'#c53030':msgType==='warning'?'#92400e':'#276749' };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h2 style={styles.navTitle}>🎓 College ERP — Admin Panel</h2>
        <div style={styles.navRight}>
          <span style={styles.adminName}>👤 {admin.name}</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button key={tab} style={{...styles.tab, ...(activeTab===tab ? styles.activeTab : {})}}
            onClick={() => { setActiveTab(tab); setMsg(''); setForm({}); setStudentLevel(''); setStudentFaculty(''); setSubjectLevel(''); setSubjectFaculty(''); }}>
            {tab === 'levels' ? '🏫 Levels & Faculties' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {msg && <div style={msgStyle}>{msg}</div>}

      <div style={styles.content}>

        {/* LEVELS, FACULTIES & PROGRAMMES */}
        {activeTab === 'levels' && (
          <div style={styles.threeCol}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🎯 Levels</h3>
              <form onSubmit={handleAddLevel} style={styles.form}>
                <input style={styles.input} placeholder="Level Name (e.g. UG)" value={form.level_name||''} onChange={e => setForm({...form, level_name: e.target.value})} required />
                <input style={styles.input} placeholder="Description" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} />
                <button style={styles.addBtn} type="submit">Add</button>
              </form>
              <table style={styles.table}>
                <thead><tr>{['ID','Level','Desc','Del'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{levels.map(l=>(
                  <tr key={l.level_id}>
                    <td style={styles.td}>{l.level_id}</td>
                    <td style={styles.td}><span style={{...styles.badge, background:'#4c51bf'}}>{l.level_name}</span></td>
                    <td style={styles.td}>{l.description}</td>
                    <td style={styles.td}><button style={styles.delBtn} onClick={()=>API.delete(`/levels/${l.level_id}`).then(fetchLevels)}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏛️ Faculties</h3>
              <form onSubmit={handleAddFaculty} style={styles.form}>
                <input style={styles.input} placeholder="Faculty Name (e.g. Arts)" value={form.faculty_name||''} onChange={e => setForm({...form, faculty_name: e.target.value})} required />
                <input style={styles.input} placeholder="Description" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} />
                <button style={styles.addBtn} type="submit">Add</button>
              </form>
              <table style={styles.table}>
                <thead><tr>{['ID','Faculty','Desc','Del'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{faculties.map(f=>(
                  <tr key={f.faculty_id}>
                    <td style={styles.td}>{f.faculty_id}</td>
                    <td style={styles.td}><span style={{...styles.badge, background: facultyColors[f.faculty_name]||'#667eea'}}>{f.faculty_name}</span></td>
                    <td style={styles.td}>{f.description}</td>
                    <td style={styles.td}><button style={styles.delBtn} onClick={()=>API.delete(`/faculties/${f.faculty_id}`).then(fetchFaculties)}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📚 Programmes</h3>
              <form onSubmit={handleAddProgramme} style={styles.form}>
                <select style={styles.input} value={form.level_id||''} onChange={e => setForm({...form, level_id: e.target.value})} required>
                  <option value="">Select Level</option>
                  {levels.map(l => <option key={l.level_id} value={l.level_id}>{l.level_name}</option>)}
                </select>
                <select style={styles.input} value={form.faculty_id||''} onChange={e => setForm({...form, faculty_id: e.target.value})} required>
                  <option value="">Select Faculty</option>
                  {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                </select>
                <input style={styles.input} placeholder="Programme Name" value={form.programme_name||''} onChange={e => setForm({...form, programme_name: e.target.value})} required />
                <input style={styles.input} type="number" placeholder="Duration (yrs)" value={form.duration_years||''} onChange={e => setForm({...form, duration_years: e.target.value})} required />
                <button style={styles.addBtn} type="submit">Add</button>
              </form>
              <table style={styles.table}>
                <thead><tr>{['Level','Faculty','Programme','Dur','Del'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
                <tbody>{programmes.map(p=>(
                  <tr key={p.programme_id}>
                    <td style={styles.td}><span style={{...styles.badge, background:'#4c51bf'}}>{p.level_name}</span></td>
                    <td style={styles.td}><span style={{...styles.badge, background: facultyColors[p.faculty_name]||'#667eea'}}>{p.faculty_name||'N/A'}</span></td>
                    <td style={styles.td}>{p.programme_name}</td>
                    <td style={styles.td}>{p.duration_years}y</td>
                    <td style={styles.td}><button style={styles.delBtn} onClick={()=>API.delete(`/programmes/${p.programme_id}`).then(fetchProgrammes)}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* STUDENTS */}
        {activeTab === 'students' && (
          <div>
            <div style={styles.importBox}>
              <h3 style={styles.importTitle}>📥 Import Students from Excel</h3>
              <div style={styles.importActions}>
                <button style={styles.templateBtn} onClick={() => downloadTemplate('students')}>⬇️ Download Template</button>
                <label style={{...styles.importBtn, opacity: importing?0.6:1}}>
                  {importing ? '⏳ Importing...' : '📂 Choose Excel File'}
                  <input ref={studentFileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImportStudents} disabled={importing} />
                </label>
              </div>
              <p style={styles.importHint}>📋 Required: <strong>roll_no, name, email, phone, level_name, faculty_name, programme_name, semester, year, password</strong></p>
            </div>
            <h3>Add Student Manually</h3>
            <form onSubmit={handleAddStudent} style={styles.form}>
              {['roll_no','name','email','phone'].map(f => (
                <input key={f} style={styles.input} placeholder={f.replace('_',' ')} value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})} required />
              ))}
              <select style={styles.input} value={studentLevel} onChange={e => { setStudentLevel(e.target.value); setStudentFaculty(''); setForm({...form, programme_id: ''}); }} required>
                <option value="">① Select Level</option>
                {levels.map(l => <option key={l.level_id} value={l.level_id}>{l.level_name} — {l.description}</option>)}
              </select>
              <select style={styles.input} value={studentFaculty} onChange={e => { setStudentFaculty(e.target.value); setForm({...form, programme_id: ''}); }} required disabled={!studentLevel}>
                <option value="">{studentLevel ? '② Select Faculty' : 'Select Level first'}</option>
                {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
              </select>
              <select style={styles.input} value={form.programme_id||''} onChange={e => setForm({...form, programme_id: e.target.value, course: studentProgrammes.find(p=>String(p.programme_id)===e.target.value)?.programme_name||''})} required disabled={!studentFaculty}>
                <option value="">{studentFaculty ? (studentProgrammes.length ? '③ Select Programme' : 'No programmes found') : 'Select Faculty first'}</option>
                {studentProgrammes.map(p => <option key={p.programme_id} value={p.programme_id}>{p.programme_name}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="Semester" value={form.semester||''} onChange={e => setForm({...form, semester: e.target.value})} required />
              <input style={styles.input} type="number" placeholder="Year" value={form.year||''} onChange={e => setForm({...form, year: e.target.value})} required />
              <input style={styles.input} type="password" placeholder="Password" value={form.password||''} onChange={e => setForm({...form, password: e.target.value})} required />
              <button style={styles.addBtn} type="submit">Add Student</button>
            </form>
            {studentLevel && studentFaculty && studentProgrammes.length === 0 && (
              <div style={styles.warningHint}>⚠️ No programmes found for this Level + Faculty combination. Please add a programme first in the <strong>Levels & Faculties</strong> tab.</div>
            )}
            <h3>All Students ({students.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['ID','Roll No','Name','Level','Faculty','Programme','Sem','Action'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{students.map(s=>(
                <tr key={s.student_id}>
                  <td style={styles.td}>{s.student_id}</td>
                  <td style={styles.td}>{s.roll_no}</td>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}><span style={{...styles.badge, background:'#4c51bf'}}>{s.level_name||'N/A'}</span></td>
                  <td style={styles.td}><span style={{...styles.badge, background: facultyColors[s.faculty_name]||'#667eea'}}>{s.faculty_name||'N/A'}</span></td>
                  <td style={styles.td}>{s.programme_name||s.course||'N/A'}</td>
                  <td style={styles.td}>{s.semester}</td>
                  <td style={styles.td}><button style={styles.delBtn} onClick={()=>handleDelete('students',s.student_id)}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* TEACHERS */}
        {activeTab === 'teachers' && (
          <div>
            <div style={styles.importBox}>
              <h3 style={styles.importTitle}>📥 Import Teachers from Excel</h3>
              <div style={styles.importActions}>
                <button style={styles.templateBtn} onClick={() => downloadTemplate('teachers')}>⬇️ Download Template</button>
                <label style={{...styles.importBtn, opacity: importing?0.6:1}}>
                  {importing ? '⏳ Importing...' : '📂 Choose Excel File'}
                  <input ref={teacherFileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImportTeachers} disabled={importing} />
                </label>
              </div>
              <p style={styles.importHint}>📋 Required: <strong>name, email, phone, department, password</strong></p>
            </div>
            <h3>Add Teacher Manually</h3>
            <form onSubmit={handleAddTeacher} style={styles.form}>
              {['name','email','phone','department'].map(f => (
                <input key={f} style={styles.input} placeholder={f} value={form[f]||''} onChange={e => setForm({...form,[f]:e.target.value})} required />
              ))}
              <input style={styles.input} type="password" placeholder="password" value={form.password||''} onChange={e => setForm({...form, password: e.target.value})} required />
              <button style={styles.addBtn} type="submit">Add Teacher</button>
            </form>
            <h3>All Teachers ({teachers.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['ID','Name','Email','Department','Action'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{teachers.map(t=>(
                <tr key={t.teacher_id}>
                  <td style={styles.td}>{t.teacher_id}</td><td style={styles.td}>{t.name}</td>
                  <td style={styles.td}>{t.email}</td><td style={styles.td}>{t.department}</td>
                  <td style={styles.td}><button style={styles.delBtn} onClick={()=>handleDelete('teachers',t.teacher_id)}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* SUBJECTS */}
        {activeTab === 'subjects' && (
          <div>
            <div style={styles.importBox}>
              <h3 style={styles.importTitle}>📥 Import Subjects from Excel</h3>
              <div style={styles.importActions}>
                <button style={styles.templateBtn} onClick={() => downloadTemplate('subjects')}>⬇️ Download Template</button>
                <label style={{...styles.importBtn, opacity: importing?0.6:1}}>
                  {importing ? '⏳ Importing...' : '📂 Choose Excel File'}
                  <input ref={subjectFileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImportSubjects} disabled={importing} />
                </label>
              </div>
              <p style={styles.importHint}>📋 Required: <strong>subject_code, subject_name, category, semester, credits, level_name, faculty_name, programme_name</strong></p>
            </div>

            <h3>Add Subject Manually</h3>
            <form onSubmit={handleAddSubject} style={styles.form}>
              <input style={styles.input} placeholder="Subject Code" value={form.subject_code||''} onChange={e => setForm({...form, subject_code: e.target.value})} required />
              <input style={styles.input} placeholder="Subject Name" value={form.subject_name||''} onChange={e => setForm({...form, subject_name: e.target.value})} required />
              <select style={styles.input} value={form.category||''} onChange={e => setForm({...form, category: e.target.value})} required>
                <option value="">Select Category</option>
                {['MAJOR','MINOR','VAC','SEC','MDC','AEC'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <select style={styles.input} value={subjectLevel} onChange={e => { setSubjectLevel(e.target.value); setSubjectFaculty(''); setForm({...form, programme_id: ''}); }} required>
                <option value="">① Select Level</option>
                {levels.map(l => <option key={l.level_id} value={l.level_id}>{l.level_name}</option>)}
              </select>
              <select style={styles.input} value={subjectFaculty} onChange={e => { setSubjectFaculty(e.target.value); setForm({...form, programme_id: ''}); }} required disabled={!subjectLevel}>
                <option value="">{subjectLevel ? '② Select Faculty' : 'Select Level first'}</option>
                {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
              </select>
              <select style={styles.input} value={form.programme_id||''} onChange={e => setForm({...form, programme_id: e.target.value})} required disabled={!subjectFaculty}>
                <option value="">{subjectFaculty ? (subjectProgrammes.length ? '③ Select Programme' : 'No programmes found') : 'Select Faculty first'}</option>
                {subjectProgrammes.map(p => <option key={p.programme_id} value={p.programme_id}>{p.programme_name}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="Semester" value={form.semester||''} onChange={e => setForm({...form, semester: e.target.value})} required />
              <input style={styles.input} type="number" placeholder="Credits" value={form.credits||''} onChange={e => setForm({...form, credits: e.target.value})} required />
              <button style={styles.addBtn} type="submit">Add Subject</button>
            </form>
            {subjectLevel && subjectFaculty && subjectProgrammes.length === 0 && (
              <div style={styles.warningHint}>⚠️ No programmes found for this Level + Faculty. Please add a programme first in <strong>Levels & Faculties</strong> tab.</div>
            )}

            {/* FILTER BOX */}
            <div style={styles.filterBox}>
              <h3 style={styles.filterTitle}>🔍 Filter Subjects</h3>
              <div style={styles.filterRow}>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Level</label>
                  <select style={styles.filterInput} value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterFaculty(''); setFilterProgramme(''); }}>
                    <option value="">All Levels</option>
                    {levels.map(l => <option key={l.level_id} value={l.level_id}>{l.level_name}</option>)}
                  </select>
                </div>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Faculty</label>
                  <select style={styles.filterInput} value={filterFaculty} onChange={e => { setFilterFaculty(e.target.value); setFilterProgramme(''); }} disabled={!filterLevel}>
                    <option value="">{filterLevel ? 'All Faculties' : 'Select Level'}</option>
                    {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                  </select>
                </div>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Programme</label>
                  <select style={styles.filterInput} value={filterProgramme} onChange={e => setFilterProgramme(e.target.value)} disabled={!filterFaculty}>
                    <option value="">{filterFaculty ? 'All Programmes' : 'Select Faculty'}</option>
                    {filterProgrammes.map(p => <option key={p.programme_id} value={p.programme_id}>{p.programme_name}</option>)}
                  </select>
                </div>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>Category</label>
                  <select style={styles.filterInput} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {['MAJOR','MINOR','VAC','SEC','MDC','AEC'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={styles.filterField}>
                  <label style={styles.filterLabel}>&nbsp;</label>
                  <button style={styles.clearBtn} onClick={() => { setFilterLevel(''); setFilterFaculty(''); setFilterProgramme(''); setFilterCategory(''); }}>✖ Clear</button>
                </div>
              </div>
              <p style={styles.filterCount}>Showing <strong>{filteredSubjects.length}</strong> of <strong>{subjects.length}</strong> subjects</p>
            </div>

            <h3>Subjects ({filteredSubjects.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['ID','Code','Name','Level','Faculty','Programme','Category','Sem','Credits','Action'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr><td colSpan="10" style={{...styles.td, textAlign:'center', color:'#718096', padding:'2rem'}}>No subjects match the selected filters</td></tr>
                ) : filteredSubjects.map(s=>(
                  <tr key={s.subject_id}>
                    <td style={styles.td}>{s.subject_id}</td>
                    <td style={styles.td}><strong>{s.subject_code}</strong></td>
                    <td style={styles.td}>{s.subject_name}</td>
                    <td style={styles.td}><span style={{...styles.badge, background:'#4c51bf'}}>{s.level_name||'N/A'}</span></td>
                    <td style={styles.td}><span style={{...styles.badge, background: facultyColors[s.faculty_name]||'#667eea'}}>{s.faculty_name||'N/A'}</span></td>
                    <td style={styles.td}>{s.programme_name||'N/A'}</td>
                    <td style={styles.td}><span style={{...styles.badge, background: categoryColors[s.category]||'#667eea'}}>{s.category}</span></td>
                    <td style={styles.td}>{s.semester}</td>
                    <td style={styles.td}>{s.credits}</td>
                    <td style={styles.td}><button style={styles.delBtn} onClick={()=>handleDelete('subjects',s.subject_id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div>
            <div style={styles.readonlyBanner}>👁️ View Only — Attendance is marked by Teachers only</div>
            <h3>All Attendance Records ({attendance.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['ID','Student','Subject','Date','Status'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{attendance.map(a=>(
                <tr key={a.attendance_id}>
                  <td style={styles.td}>{a.attendance_id}</td><td style={styles.td}>{a.student_name}</td>
                  <td style={styles.td}>{a.subject_name}</td>
                  <td style={styles.td}>{new Date(a.date).toLocaleDateString()}</td>
                  <td style={styles.td}><span style={{...styles.badge, background: a.status==='PRESENT'?'#48bb78':a.status==='LATE'?'#ed8936':'#e53e3e'}}>{a.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* FEES */}
        {activeTab === 'fees' && (
          <div>
            <div style={styles.importBox}>
              <h3 style={styles.importTitle}>📥 Import Fees from Excel</h3>
              <div style={styles.importActions}>
                <button style={styles.templateBtn} onClick={() => downloadTemplate('fees')}>⬇️ Download Template</button>
                <label style={{...styles.importBtn, opacity: importing?0.6:1}}>
                  {importing ? '⏳ Importing...' : '📂 Choose Excel File'}
                  <input ref={feeFileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImportFees} disabled={importing} />
                </label>
              </div>
              <p style={styles.importHint}>📋 Required: <strong>roll_no, amount, fee_type, due_date</strong></p>
            </div>
            <h3>Add Fee Manually</h3>
            <form onSubmit={handleAddFee} style={styles.form}>
              <select style={styles.input} value={form.student_id||''} onChange={e => setForm({...form, student_id: e.target.value})} required>
                <option value="">Select Student</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.roll_no} - {s.name}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="Amount (₹)" value={form.amount||''} onChange={e => setForm({...form, amount: e.target.value})} required />
              <input style={styles.input} placeholder="Fee Type" value={form.fee_type||''} onChange={e => setForm({...form, fee_type: e.target.value})} required />
              <input style={styles.input} type="date" value={form.due_date||''} onChange={e => setForm({...form, due_date: e.target.value})} required />
              <button style={styles.addBtn} type="submit">Add Fee</button>
            </form>
            <h3>All Fee Records ({fees.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['ID','Student','Roll No','Amount','Type','Due Date','Status','Action'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{fees.map(f=>(
                <tr key={f.fee_id}>
                  <td style={styles.td}>{f.fee_id}</td><td style={styles.td}>{f.student_name}</td>
                  <td style={styles.td}>{f.roll_no}</td><td style={styles.td}>₹{f.amount}</td>
                  <td style={styles.td}>{f.fee_type}</td>
                  <td style={styles.td}>{new Date(f.due_date).toLocaleDateString()}</td>
                  <td style={styles.td}><span style={{...styles.badge, background: f.status==='PAID'?'#48bb78':f.status==='OVERDUE'?'#e53e3e':'#ed8936'}}>{f.status}</span></td>
                  <td style={styles.td}>
                    {f.status !== 'PAID'
                      ? <button style={styles.payBtn} onClick={() => handleMarkPaid(f.fee_id)}>Mark Paid</button>
                      : <span style={{color:'#48bb78', fontWeight:'600'}}>✅ Paid</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* MARKS */}
        {activeTab === 'marks' && (
          <div>
            <div style={styles.readonlyBanner}>👁️ View Only — Marks are entered by Teachers only</div>
            <h3>All Marks Records ({marks.length})</h3>
            <table style={styles.table}>
              <thead><tr>{['ID','Student','Subject','Exam Type','Marks','Max','Percentage','Semester'].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>{marks.map(m=>(
                <tr key={m.mark_id}>
                  <td style={styles.td}>{m.mark_id}</td><td style={styles.td}>{m.student_name}</td>
                  <td style={styles.td}>{m.subject_name}</td>
                  <td style={styles.td}><span style={{...styles.badge, background:'#9f7aea'}}>{m.exam_type}</span></td>
                  <td style={styles.td}><strong>{m.marks_obtained}</strong></td>
                  <td style={styles.td}>{m.max_marks}</td>
                  <td style={styles.td}><span style={{...styles.badge, background:(m.marks_obtained/m.max_marks*100)>=60?'#48bb78':'#e53e3e'}}>{((m.marks_obtained/m.max_marks)*100).toFixed(1)}%</span></td>
                  <td style={styles.td}>{m.semester}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const categoryColors = { MAJOR:'#4c51bf', MINOR:'#38a169', VAC:'#d69e2e', SEC:'#e53e3e', MDC:'#dd6b20', AEC:'#805ad5' };

const styles = {
  container: { minHeight: '100vh', background: '#f0f4f8' },
  nav: { background: '#2d3748', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navTitle: { color: '#fff', margin: 0 },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  adminName: { color: '#a0aec0' },
  logoutBtn: { background: '#e53e3e', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' },
  tabs: { display: 'flex', background: '#fff', borderBottom: '2px solid #e2e8f0', padding: '0 2rem', flexWrap: 'wrap' },
  tab: { padding: '1rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#718096', textTransform: 'capitalize' },
  activeTab: { color: '#4c51bf', borderBottom: '2px solid #4c51bf', fontWeight: '600' },
  content: { padding: '2rem' },
  msg: { padding: '0.75rem 2rem', fontWeight: '600' },
  threeCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' },
  section: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  sectionTitle: { margin: '0 0 1rem', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' },
  readonlyBanner: { background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #90cdf4', borderRadius: '8px', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', fontWeight: '600' },
  warningHint: { background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '8px', padding: '0.75rem 1.25rem', marginBottom: '1rem', fontSize: '0.9rem' },
  importBox: { background: '#fff', border: '2px dashed #4c51bf', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' },
  importTitle: { color: '#4c51bf', marginTop: 0 },
  importActions: { display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  templateBtn: { padding: '0.6rem 1.2rem', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #90cdf4', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  importBtn: { padding: '0.6rem 1.2rem', background: '#4c51bf', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  importHint: { color: '#718096', fontSize: '0.85rem', margin: 0 },
  filterBox: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  filterTitle: { color: '#2d3748', marginTop: 0, marginBottom: '1rem' },
  filterRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterField: { display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '160px' },
  filterLabel: { fontSize: '0.8rem', fontWeight: '600', color: '#4a5568' },
  filterInput: { padding: '0.6rem 0.9rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.9rem', background: '#f7fafc' },
  filterCount: { margin: '0.75rem 0 0', fontSize: '0.9rem', color: '#4a5568' },
  clearBtn: { padding: '0.6rem 1rem', background: '#fed7d7', color: '#c53030', border: '1px solid #fc8181', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  form: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px' },
  input: { padding: '0.6rem 0.9rem', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95rem', minWidth: '160px' },
  addBtn: { padding: '0.6rem 1.5rem', background: '#4c51bf', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  payBtn: { padding: '0.3rem 0.75rem', background: '#48bb78', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  th: { background: '#2d3748', color: '#fff', padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem' },
  td: { padding: '0.65rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' },
  delBtn: { background: '#e53e3e', color: '#fff', border: 'none', padding: '0.3rem 0.75rem', borderRadius: '4px', cursor: 'pointer' },
  badge: { padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#fff', fontSize: '0.75rem', fontWeight: '600' },
};
