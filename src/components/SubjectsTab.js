import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import API from '../api';

const categoryColors = {
  MAJOR:'#4c51bf', MINOR:'#38a169', VAC:'#d69e2e',
  SEC:'#e53e3e', MDC:'#dd6b20', AEC:'#805ad5',
  DSC:'#0694a2', MIC:'#057a55'
};

const categoryLabels = {
  MAJOR: 'Discipline Specific Course',
  MIC: 'Minor Course/Vocational',
  MDC: 'Multidisciplinary Course',
  SEC: 'Skill Enhancement Course',
  VAC: 'Value Added Course',
  AEC: 'Ability Enhancement Course',
  MINOR: 'Minor Course',
  DSC: 'Discipline Specific Course',
};

export default function SubjectsTab({ levels, faculties, programmes, showMsg }) {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({});
  const [subjectLevel, setSubjectLevel] = useState('');
  const [subjectFaculty, setSubjectFaculty] = useState('');
  const [subjectProgrammes, setSubjectProgrammes] = useState([]);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProgrammes, setFilterProgrammes] = useState([]);
  const [importing, setImporting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchSubjects(); }, []);

  useEffect(() => {
    if (subjectLevel && subjectFaculty) {
      setSubjectProgrammes(programmes.filter(p =>
        String(p.level_id) === String(subjectLevel) &&
        String(p.faculty_id) === String(subjectFaculty)
      ));
    } else { setSubjectProgrammes([]); }
  }, [subjectLevel, subjectFaculty, programmes]);

  useEffect(() => {
    if (filterLevel && filterFaculty) {
      setFilterProgrammes(programmes.filter(p =>
        String(p.level_id) === String(filterLevel) &&
        String(p.faculty_id) === String(filterFaculty)
      ));
    } else if (filterLevel) {
      setFilterProgrammes(programmes.filter(p => String(p.level_id) === String(filterLevel)));
    } else { setFilterProgrammes([]); setFilterProgramme(''); }
  }, [filterLevel, filterFaculty, programmes]);

  const fetchSubjects = async () => {
    try { const r = await API.get('/subjects'); setSubjects(r.data); } catch(e){}
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await API.post('/subjects', { ...form, level_id: subjectLevel, faculty_id: subjectFaculty });
      showMsg('Subject added!');
      setForm({}); setSubjectLevel(''); setSubjectFaculty(''); setShowForm(false);
      fetchSubjects();
    } catch(err) { showMsg(err.response?.data?.error||'Error','error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try { await API.delete(`/admin/subjects/${id}`); showMsg('Deleted!'); fetchSubjects(); }
    catch(e) { showMsg('Delete failed!','error'); }
  };

  const downloadTemplate = () => {
    const data = [
      { subject_code:'C24CAP101T', subject_name:'Computer Fundamentals', category:'MAJOR', semester:1, credits:3, contact_hours:3, internal_marks:20, end_term_marks:50, total_marks:70, exam_duration:2.5, level_name:'UG', faculty_name:'Science', programme_name:'B.Sc Computer Science' },
      { subject_code:'C24CAP101P', subject_name:'Computer Fundamentals Lab', category:'MAJOR', semester:1, credits:1, contact_hours:2, internal_marks:10, end_term_marks:20, total_marks:30, exam_duration:3, level_name:'UG', faculty_name:'Science', programme_name:'B.Sc Computer Science' },
      { subject_code:'C24MIC124T', subject_name:'Information Technology', category:'MIC', semester:1, credits:2, contact_hours:2, internal_marks:15, end_term_marks:35, total_marks:50, exam_duration:2, level_name:'UG', faculty_name:'Science', programme_name:'B.Sc Computer Science' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'subjects');
    XLSX.writeFile(wb, 'subjects_template.xlsx');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return; setImporting(true);
    try {
      const data = await file.arrayBuffer(); const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const validCats = ['MAJOR','MINOR','VAC','SEC','MDC','AEC','DSC','MIC'];
      const levelMap = {}; levels.forEach(l => { levelMap[l.level_name.toUpperCase()] = l.level_id; });
      const progMap = {}; programmes.forEach(p => { progMap[p.programme_name.toLowerCase()] = p.programme_id; });
      const facMap = {}; faculties.forEach(f => { facMap[f.faculty_name.toLowerCase()] = f.faculty_id; });
      let success = 0, failed = 0;
      for (const row of rows) {
        try {
          const category = String(row.category||'').toUpperCase();
          if (!validCats.includes(category)) { failed++; continue; }
          await API.post('/subjects', {
            subject_code: String(row.subject_code||''),
            subject_name: String(row.subject_name||''),
            category, semester: Number(row.semester||1),
            credits: Number(row.credits||0),
            contact_hours: Number(row.contact_hours||0),
            internal_marks: Number(row.internal_marks||0),
            end_term_marks: Number(row.end_term_marks||0),
            total_marks: Number(row.total_marks||0),
            exam_duration: Number(row.exam_duration||0),
            level_id: levelMap[String(row.level_name||'').toUpperCase()] || null,
            programme_id: progMap[String(row.programme_name||'').toLowerCase()] || null,
            faculty_id: facMap[String(row.faculty_name||'').toLowerCase()] || null,
          });
          success++;
        } catch { failed++; }
      }
      showMsg(`✅ Imported ${success}${failed?`, ❌ ${failed} failed`:''}`, failed?'warning':'success');
      fetchSubjects();
    } catch { showMsg('Failed to read file!','error'); }
    finally { setImporting(false); e.target.value=''; }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchLevel = !filterLevel || String(s.level_id) === String(filterLevel);
    const matchFaculty = !filterFaculty || String(s.faculty_id) === String(filterFaculty);
    const matchProgramme = !filterProgramme || String(s.programme_id) === String(filterProgramme);
    const matchSemester = !filterSemester || String(s.semester) === String(filterSemester);
    const matchCategory = !filterCategory || s.category === filterCategory;
    return matchLevel && matchFaculty && matchProgramme && matchSemester && matchCategory;
  });

  // Group by semester then by category
  const groupedBySemester = {};
  filteredSubjects.forEach(s => {
    const sem = s.semester || 0;
    if (!groupedBySemester[sem]) groupedBySemester[sem] = {};
    const cat = s.category || 'OTHER';
    if (!groupedBySemester[sem][cat]) groupedBySemester[sem][cat] = [];
    groupedBySemester[sem][cat].push(s);
  });

  const facultyColors = { 'Arts': '#9f7aea', 'Science': '#48bb78', 'Commerce': '#ed8936' };

  return (
    <div>
      {/* Import Box */}
      <div style={s.importBox}>
        <h3 style={s.importTitle}>📥 Import Subjects from Excel</h3>
        <div style={s.importActions}>
          <button style={s.templateBtn} onClick={downloadTemplate}>⬇️ Download Template</button>
          <label style={{...s.importBtn, opacity: importing?0.6:1}}>
            {importing ? '⏳ Importing...' : '📂 Choose Excel File'}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImport} disabled={importing} />
          </label>
        </div>
        <p style={s.importHint}>📋 Columns: <strong>subject_code, subject_name, category, semester, credits, contact_hours, internal_marks, end_term_marks, total_marks, exam_duration, level_name, faculty_name, programme_name</strong></p>
        <p style={s.importHint}>📌 Categories: <strong>MAJOR (DSC), MIC (Minor/Vocational), MDC, SEC, VAC, AEC</strong></p>
      </div>

      {/* Add Form Toggle */}
      <button style={s.toggleBtn} onClick={() => setShowForm(!showForm)}>
        {showForm ? '✕ Close Form' : '➕ Add Subject Manually'}
      </button>

      {showForm && (
        <div style={s.formBox}>
          <h3 style={{margin:'0 0 1.5rem', color:'#2d3748'}}>➕ Add New Subject</h3>
          <form onSubmit={handleAdd}>
            {/* Section 1: Programme */}
            <div style={s.formSection}>
              <h4 style={s.formSectionTitle}>📚 Programme Details</h4>
              <div style={s.formRow}>
                <div style={s.formField}>
                  <label style={s.formLabel}>① Level *</label>
                  <select style={s.input} value={subjectLevel} onChange={e=>{setSubjectLevel(e.target.value);setSubjectFaculty('');setForm({...form,programme_id:''});}} required>
                    <option value="">Select Level</option>
                    {levels.map(l=><option key={l.level_id} value={l.level_id}>{l.level_name}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>② Faculty *</label>
                  <select style={s.input} value={subjectFaculty} onChange={e=>{setSubjectFaculty(e.target.value);setForm({...form,programme_id:''});}} required disabled={!subjectLevel}>
                    <option value="">{subjectLevel?'Select Faculty':'Select Level first'}</option>
                    {faculties.map(f=><option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>③ Programme *</label>
                  <select style={s.input} value={form.programme_id||''} onChange={e=>setForm({...form,programme_id:e.target.value})} required disabled={!subjectFaculty}>
                    <option value="">{subjectFaculty?(subjectProgrammes.length?'Select Programme':'No programmes found'):'Select Faculty first'}</option>
                    {subjectProgrammes.map(p=><option key={p.programme_id} value={p.programme_id}>{p.programme_name}</option>)}
                  </select>
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>Semester *</label>
                  <select style={s.input} value={form.semester||''} onChange={e=>setForm({...form,semester:e.target.value})} required>
                    <option value="">Select</option>
                    {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>Semester {n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Subject Info */}
            <div style={s.formSection}>
              <h4 style={s.formSectionTitle}>📝 Subject Details</h4>
              <div style={s.formRow}>
                <div style={s.formField}>
                  <label style={s.formLabel}>Course Code *</label>
                  <input style={s.input} placeholder="e.g. C24CAP101T" value={form.subject_code||''} onChange={e=>setForm({...form,subject_code:e.target.value})} required />
                </div>
                <div style={{...s.formField, flex:2}}>
                  <label style={s.formLabel}>Nomenclature of Paper *</label>
                  <input style={s.input} placeholder="e.g. Computer Fundamentals" value={form.subject_name||''} onChange={e=>setForm({...form,subject_name:e.target.value})} required />
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>Course Type *</label>
                  <select style={s.input} value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})} required>
                    <option value="">Select Type</option>
                    <option value="MAJOR">Discipline Specific Course (DSC)</option>
                    <option value="MIC">Minor Course / Vocational</option>
                    <option value="MDC">Multidisciplinary Course</option>
                    <option value="SEC">Skill Enhancement Course</option>
                    <option value="VAC">Value Added Course</option>
                    <option value="AEC">Ability Enhancement Course</option>
                    <option value="MINOR">Minor Course</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Marks */}
            <div style={s.formSection}>
              <h4 style={s.formSectionTitle}>📊 Marks & Hours</h4>
              <div style={s.formRow}>
                <div style={s.formField}>
                  <label style={s.formLabel}>Credits *</label>
                  <input style={s.input} type="number" placeholder="e.g. 3" value={form.credits||''} onChange={e=>setForm({...form,credits:e.target.value})} required />
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>Contact Hours</label>
                  <input style={s.input} type="number" placeholder="e.g. 3" value={form.contact_hours||''} onChange={e=>setForm({...form,contact_hours:e.target.value})} />
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>Internal Marks</label>
                  <input style={s.input} type="number" placeholder="e.g. 20" value={form.internal_marks||''} onChange={e=>setForm({...form,internal_marks:e.target.value})} />
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>End Term Marks</label>
                  <input style={s.input} type="number" placeholder="e.g. 50" value={form.end_term_marks||''} onChange={e=>setForm({...form,end_term_marks:e.target.value})} />
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>Total Marks</label>
                  <input style={s.input} type="number" placeholder="e.g. 70" value={form.total_marks||''} onChange={e=>setForm({...form,total_marks:e.target.value})} />
                </div>
                <div style={s.formField}>
                  <label style={s.formLabel}>Exam Duration (hrs)</label>
                  <input style={s.input} type="number" step="0.5" placeholder="e.g. 2.5" value={form.exam_duration||''} onChange={e=>setForm({...form,exam_duration:e.target.value})} />
                </div>
              </div>
            </div>

            <button style={s.addBtn} type="submit">✅ Add Subject</button>
          </form>
        </div>
      )}

      {/* Filter Box */}
      <div style={s.filterBox}>
        <h3 style={s.filterTitle}>🔍 Filter Subjects</h3>
        <div style={s.filterRow}>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Level</label>
            <select style={s.filterInput} value={filterLevel} onChange={e=>{setFilterLevel(e.target.value);setFilterFaculty('');setFilterProgramme('');}}>
              <option value="">All Levels</option>
              {levels.map(l=><option key={l.level_id} value={l.level_id}>{l.level_name}</option>)}
            </select>
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Faculty</label>
            <select style={s.filterInput} value={filterFaculty} onChange={e=>{setFilterFaculty(e.target.value);setFilterProgramme('');}} disabled={!filterLevel}>
              <option value="">{filterLevel?'All Faculties':'Select Level'}</option>
              {faculties.map(f=><option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
            </select>
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Programme</label>
            <select style={s.filterInput} value={filterProgramme} onChange={e=>setFilterProgramme(e.target.value)} disabled={!filterFaculty}>
              <option value="">{filterFaculty?'All Programmes':'Select Faculty'}</option>
              {filterProgrammes.map(p=><option key={p.programme_id} value={p.programme_id}>{p.programme_name}</option>)}
            </select>
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Semester</label>
            <select style={s.filterInput} value={filterSemester} onChange={e=>setFilterSemester(e.target.value)}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>Course Type</label>
            <select style={s.filterInput} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
              <option value="">All Types</option>
              <option value="MAJOR">DSC/Major</option>
              <option value="MIC">Minor/Vocational</option>
              <option value="MDC">Multidisciplinary</option>
              <option value="SEC">Skill Enhancement</option>
              <option value="VAC">Value Added</option>
              <option value="AEC">Ability Enhancement</option>
            </select>
          </div>
          <div style={s.filterField}>
            <label style={s.filterLabel}>&nbsp;</label>
            <button style={s.clearBtn} onClick={()=>{setFilterLevel('');setFilterFaculty('');setFilterProgramme('');setFilterSemester('');setFilterCategory('');}}>✖ Clear</button>
          </div>
        </div>
        <p style={s.filterCount}>Showing <strong>{filteredSubjects.length}</strong> of <strong>{subjects.length}</strong> subjects</p>
      </div>

      {/* Subject Table - Grouped by Semester then Category */}
      {Object.keys(groupedBySemester).sort((a,b)=>Number(a)-Number(b)).map(sem => (
        <div key={sem} style={s.semesterBlock}>
          <h3 style={s.semesterTitle}>📅 SEMESTER - {sem}</h3>
          <table style={s.table}>
            <thead>
              <tr>
                {['Course Type','Course Code','Nomenclature of Paper','Credits','Contact Hrs','Internal Marks','End Term Marks','Total Marks','Exam Duration','Action'].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedBySemester[sem]).map(cat => (
                groupedBySemester[sem][cat].map((sub, idx) => (
                  <tr key={sub.subject_id} style={{background: idx%2===0?'#fff':'#f9fafb'}}>
                    {idx === 0 ? (
                      <td style={{...s.td, ...s.courseTypeTd, background: categoryColors[cat]+'22', color: categoryColors[cat], fontWeight:'700'}}
                        rowSpan={groupedBySemester[sem][cat].length}>
                        {categoryLabels[cat] || cat}
                      </td>
                    ) : null}
                    <td style={{...s.td, fontWeight:'600', fontFamily:'monospace'}}>{sub.subject_code}</td>
                    <td style={s.td}>{sub.subject_name}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.credits}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.contact_hours || '-'}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.internal_marks || '-'}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.end_term_marks || '-'}</td>
                    <td style={{...s.td, textAlign:'center', fontWeight:'700'}}>{sub.total_marks || '-'}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sub.exam_duration ? `${sub.exam_duration} hrs` : '-'}</td>
                    <td style={s.td}>
                      <button style={s.delBtn} onClick={()=>handleDelete(sub.subject_id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {filteredSubjects.length === 0 && (
        <div style={s.emptyState}>📭 No subjects found. Add subjects or adjust filters.</div>
      )}
    </div>
  );
}

const s = {
  importBox: { background:'#fff', border:'2px dashed #4c51bf', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.5rem' },
  importTitle: { color:'#4c51bf', marginTop:0 },
  importActions: { display:'flex', gap:'1rem', marginBottom:'0.75rem', flexWrap:'wrap' },
  templateBtn: { padding:'0.6rem 1.2rem', background:'#ebf8ff', color:'#2b6cb0', border:'1px solid #90cdf4', borderRadius:'6px', cursor:'pointer', fontWeight:'600' },
  importBtn: { padding:'0.6rem 1.2rem', background:'#4c51bf', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'600' },
  importHint: { color:'#718096', fontSize:'0.82rem', margin:'0.25rem 0 0' },
  toggleBtn: { padding:'0.7rem 1.5rem', background:'#4c51bf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600', marginBottom:'1rem', fontSize:'0.95rem' },
  formBox: { background:'#fff', padding:'1.5rem', borderRadius:'12px', marginBottom:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  formSection: { marginBottom:'1.25rem', padding:'1rem', background:'#f7fafc', borderRadius:'8px' },
  formSectionTitle: { margin:'0 0 1rem', color:'#4a5568', fontSize:'0.9rem', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.05em' },
  formRow: { display:'flex', flexWrap:'wrap', gap:'0.75rem' },
  formField: { display:'flex', flexDirection:'column', gap:'0.3rem', flex:1, minWidth:'160px' },
  formLabel: { fontSize:'0.8rem', fontWeight:'600', color:'#4a5568' },
  input: { padding:'0.6rem 0.9rem', borderRadius:'6px', border:'1px solid #cbd5e0', fontSize:'0.9rem', width:'100%', boxSizing:'border-box' },
  addBtn: { padding:'0.75rem 2rem', background:'#48bb78', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'700', fontSize:'1rem', marginTop:'0.5rem' },
  filterBox: { background:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' },
  filterTitle: { color:'#2d3748', marginTop:0, marginBottom:'1rem' },
  filterRow: { display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-end' },
  filterField: { display:'flex', flexDirection:'column', gap:'0.3rem', minWidth:'140px' },
  filterLabel: { fontSize:'0.8rem', fontWeight:'600', color:'#4a5568' },
  filterInput: { padding:'0.6rem 0.9rem', borderRadius:'6px', border:'1px solid #cbd5e0', fontSize:'0.85rem', background:'#f7fafc' },
  filterCount: { margin:'0.75rem 0 0', fontSize:'0.85rem', color:'#4a5568' },
  clearBtn: { padding:'0.6rem 1rem', background:'#fed7d7', color:'#c53030', border:'1px solid #fc8181', borderRadius:'6px', cursor:'pointer', fontWeight:'600' },
  semesterBlock: { marginBottom:'2rem' },
  semesterTitle: { background:'#2d3748', color:'#fff', padding:'0.75rem 1.5rem', borderRadius:'8px 8px 0 0', margin:0, fontSize:'1rem' },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderRadius:'0 0 8px 8px', overflow:'hidden' },
  th: { background:'#4a5568', color:'#fff', padding:'0.75rem 0.75rem', textAlign:'left', fontSize:'0.8rem', fontWeight:'600', borderRight:'1px solid #718096' },
  td: { padding:'0.65rem 0.75rem', borderBottom:'1px solid #e2e8f0', fontSize:'0.85rem', borderRight:'1px solid #f0f4f8', verticalAlign:'middle' },
  courseTypeTd: { padding:'0.75rem', fontSize:'0.85rem', borderRight:'2px solid #e2e8f0', verticalAlign:'middle', textAlign:'center', minWidth:'120px' },
  delBtn: { background:'#e53e3e', color:'#fff', border:'none', padding:'0.25rem 0.6rem', borderRadius:'4px', cursor:'pointer', fontSize:'0.8rem' },
  emptyState: { background:'#fff', padding:'3rem', textAlign:'center', borderRadius:'12px', color:'#718096', fontSize:'1.1rem' },
};
