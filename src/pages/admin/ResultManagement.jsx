import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function ResultManagement() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [existingResults, setExistingResults] = useState({});
  
  // Selections
  const [examTerm, setExamTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  // Marks Entry Modal State
  const [activeStudent, setActiveStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Classes
  useEffect(() => {
    const fetchClasses = async () => {
      const snap = await getDocs(collection(db, "classes"));
      setClasses(snap.docs.map(c => ({ id: c.id, ...c.data() })));
    };
    fetchClasses();
  }, []);

  const activeClass = classes.find(c => c.id === selectedClassId);

  // 2. Fetch Students & their Results for the selected Exam Term
  const fetchStudentsAndResults = async () => {
    if (!selectedClassId || !selectedSection || !examTerm) {
      setStudents([]);
      setExistingResults({});
      return;
    }
    
    // Get students
    const qStudents = query(collection(db, "students"), where("classId", "==", selectedClassId), where("section", "==", selectedSection));
    const snapStudents = await getDocs(qStudents);
    const studentData = snapStudents.docs.map(d => ({ id: d.id, ...d.data() }));
    studentData.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
    setStudents(studentData);

    // Get existing results to check who is graded
    const qResults = query(collection(db, "exam_results"), where("classId", "==", selectedClassId), where("section", "==", selectedSection), where("examName", "==", examTerm));
    const snapResults = await getDocs(qResults);
    
    const resultsMap = {};
    snapResults.forEach(d => { resultsMap[d.data().studentId] = true; });
    setExistingResults(resultsMap);
  };

  useEffect(() => {
    fetchStudentsAndResults();
  }, [selectedClassId, selectedSection, examTerm]);

  // Open the grading modal
  const openGradingModal = async (student) => {
    setActiveStudent(student);
    
    // Check if result already exists in DB
    const resultId = `${student.id}_${examTerm.replace(/\s+/g, '_')}`;
    const resultDoc = await getDoc(doc(db, "exam_results", resultId));

   if (activeClass?.savedSubjects && activeClass.savedSubjects.length > 0) {
        setSubjects(activeClass.savedSubjects.map(sub => ({ 
          name: typeof sub === 'string' ? sub : sub.subject, // Now safely extracts object names!
          fullMarks: 100, 
          marksObtained: "" 
        })));
      } else {
      // Create fresh subject list based on the Class's Saved Subjects (from the Admit Card page)
      if (activeClass?.savedSubjects && activeClass.savedSubjects.length > 0) {
        setSubjects(activeClass.savedSubjects.map(sub => ({ name: sub, fullMarks: 100, marksObtained: "" })));
      } else {
        // Fallback if they didn't save subjects yet
        setSubjects([{ name: "", fullMarks: 100, marksObtained: "" }]);
      }
    }
  };

  const handleSubjectChange = (index, field, value) => {
    const updated = [...subjects];
    updated[index][field] = value;
    setSubjects(updated);
  };

  const calculateGrade = (obtained, full) => {
    const perc = (obtained / full) * 100;
    if (perc >= 91) return "A1";
    if (perc >= 81) return "A2";
    if (perc >= 71) return "B1";
    if (perc >= 61) return "B2";
    if (perc >= 51) return "C1";
    if (perc >= 41) return "C2";
    if (perc >= 33) return "D";
    return "E";
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let totalFull = 0;
      let totalObtained = 0;

      // Calculate totals and grades for each subject
      const processedSubjects = subjects.map(sub => {
        const full = Number(sub.fullMarks) || 100;
        const obtained = Number(sub.marksObtained) || 0;
        totalFull += full;
        totalObtained += obtained;
        return { ...sub, fullMarks: full, marksObtained: obtained, grade: calculateGrade(obtained, full) };
      });

      const overallGrade = calculateGrade(totalObtained, totalFull);
      const resultId = `${activeStudent.id}_${examTerm.replace(/\s+/g, '_')}`;

      await setDoc(doc(db, "exam_results", resultId), {
        studentId: activeStudent.id,
        studentName: activeStudent.studentName,
        rollNo: activeStudent.rollNo,
        classId: selectedClassId,
        section: selectedSection,
        examName: examTerm,
        subjects: processedSubjects,
        totalFullMarks: totalFull,
        totalObtained: totalObtained,
        overallGrade: overallGrade,
        timestamp: serverTimestamp()
      });

      setActiveStudent(null);
      fetchStudentsAndResults(); // Refresh the list
    } catch (error) {
      console.error("Error saving marks:", error);
      alert("Failed to save results.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Exam Results Entry</h1>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Exam Term</label>
          <select 
            className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold text-blue-900"
            value={examTerm} onChange={(e) => setExamTerm(e.target.value)}
          >
            <option value="">-- Select Term --</option>
            <option value="Term 1 Examination">Term 1 Examination</option>
            <option value="Term 2 Examination">Term 2 Examination</option>
            <option value="Final Annual Examination">Final Annual Examination</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Class</label>
          <select 
            className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold"
            value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}
          >
            <option value="">-- Choose Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Section</label>
          <select 
            className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold"
            value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClassId}
          >
            <option value="">-- Choose Section --</option>
            {activeClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* STUDENT LIST */}
      {selectedClassId && selectedSection && examTerm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800 text-white text-sm">
              <tr>
                <th className="p-4">Roll No</th>
                <th className="p-4">Student Name</th>
                <th className="p-4 text-center">Grading Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="4" className="p-6 text-center font-bold text-gray-500">No students found.</td></tr>
              ) : (
                students.map(student => {
                  const isGraded = existingResults[student.id];
                  return (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-700">{student.rollNo}</td>
                      <td className="p-4 font-bold text-gray-900 uppercase">{student.studentName}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${isGraded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isGraded ? "Marks Entered" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => openGradingModal(student)} 
                          className="bg-[#003b8b] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-900 transition outline-none text-sm"
                        >
                          {isGraded ? "Edit Marks" : "Enter Marks"}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* GRADING MODAL */}
      {activeStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="font-bold text-lg">Enter Marks: {activeStudent.studentName}</h3>
                <p className="text-sm text-gray-300 uppercase">{examTerm}</p>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-gray-400 hover:text-white font-bold text-2xl outline-none">&times;</button>
            </div>

            <form onSubmit={handleSaveResult} className="p-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex justify-between text-blue-900 font-bold">
                <span>Roll No: {activeStudent.rollNo}</span>
                <span>Class: {activeClass?.name} - {activeStudent.section}</span>
              </div>

              <div className="grid grid-cols-12 gap-2 mb-2 font-bold text-sm text-gray-600 px-2 uppercase">
                <div className="col-span-6">Subject</div>
                <div className="col-span-3 text-center">Full Marks</div>
                <div className="col-span-3 text-center">Marks Obtained</div>
              </div>

              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                {subjects.map((sub, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                    <input 
                      type="text" required placeholder="Subject" 
                      className="col-span-6 border-2 border-gray-200 p-2 rounded outline-none focus:border-[#003b8b] font-bold uppercase"
                      value={sub.name} onChange={(e) => handleSubjectChange(idx, "name", e.target.value)}
                    />
                    <input 
                      type="number" required min="1" 
                      className="col-span-3 border-2 border-gray-200 p-2 rounded outline-none focus:border-[#003b8b] text-center font-bold"
                      value={sub.fullMarks} onChange={(e) => handleSubjectChange(idx, "fullMarks", e.target.value)}
                    />
                    <input 
                      type="number" required min="0" max={sub.fullMarks}
                      className="col-span-3 border-2 border-green-300 p-2 rounded outline-none focus:border-green-600 text-center font-bold text-green-800"
                      value={sub.marksObtained} onChange={(e) => handleSubjectChange(idx, "marksObtained", e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setSubjects([...subjects, { name: "", fullMarks: 100, marksObtained: "" }])} className="text-[#003b8b] font-bold hover:underline mb-8 outline-none">
                + Add Another Subject
              </button>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setActiveStudent(null)} className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-100 font-bold outline-none">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`px-8 py-2 rounded-lg font-bold text-white shadow-md outline-none ${isSubmitting ? 'bg-gray-400' : 'bg-[#003b8b] hover:bg-blue-900'}`}>
                  {isSubmitting ? "Saving..." : "Save Results"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}