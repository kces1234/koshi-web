import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminAdmitCardGenerator() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [examTerm, setExamTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  // Trackers to prevent wiping inputs while typing
  const [loadedClassId, setLoadedClassId] = useState(""); 
  const [loadedExamTerm, setLoadedExamTerm] = useState("");
  
  const [schedule, setSchedule] = useState([{ subject: "", date: "", time: "" }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const snap = await getDocs(collection(db, "classes"));
      setClasses(snap.docs.map(c => ({ id: c.id, ...c.data() })));
    };
    fetchClasses();
  }, []);

  // Handle Class & Term Loading
  useEffect(() => {
    const loadClassData = async () => {
      const activeClass = classes.find(c => c.id === selectedClassId);
      
      // 1. Load specific schedule ONLY when Class or Term dropdowns change
      if (selectedClassId !== loadedClassId || examTerm !== loadedExamTerm) {
        
        const safeExamName = examTerm ? examTerm.replace(/\s+/g, '_') : "";
        const termKey = `savedSubjects_${safeExamName}`;

        if (examTerm && activeClass && activeClass[termKey] && activeClass[termKey].length > 0) {
          // A schedule for this specific term already exists! Load it.
          setSchedule(activeClass[termKey].map(sub => ({
            subject: typeof sub === 'string' ? sub : sub.subject,
            date: sub.date || "",
            time: sub.time || ""
          })));
        } else if (activeClass?.savedSubjects && activeClass.savedSubjects.length > 0) {
          // No schedule for this term yet, but we have base subjects. Load subjects, leave dates blank.
          setSchedule(activeClass.savedSubjects.map(sub => ({
            subject: typeof sub === 'string' ? sub : sub.subject,
            date: "", time: ""
          })));
        } else {
          // Completely blank slate
          setSchedule([{ subject: "", date: "", time: "" }]);
        }
        
        setLoadedClassId(selectedClassId);
        setLoadedExamTerm(examTerm);
      }

      // 2. Fetch Students for the selected class/section
      if (!selectedClassId || !selectedSection) {
        setStudents([]);
        return;
      }
      setLoading(true);
      const q = query(collection(db, "students"), where("classId", "==", selectedClassId), where("section", "==", selectedSection));
      const snap = await getDocs(q);
      const studentData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      studentData.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
      setStudents(studentData);
      setLoading(false);
    };
    
    // Explicitly run only when these specific dropdowns change
    loadClassData();
  }, [selectedClassId, selectedSection, examTerm, classes, loadedClassId, loadedExamTerm]);

  const handleScheduleChange = (index, field, value) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  const addSubjectRow = () => setSchedule([...schedule, { subject: "", date: "", time: "" }]);
  
  const removeSubjectRow = (index) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  // --- NEW: Saves to a Term-Specific Database Key ---
  const saveSubjectsToClass = async () => {
    if (!selectedClassId) return alert("Please select a class first.");
    if (!examTerm) return alert("Please select an Exam Term first. (e.g. Term 1 Examination)");

    try {
      const validSchedule = schedule.filter(s => s.subject.trim() !== "");
      if (validSchedule.length === 0) return alert("No subjects to save.");

      // Create a unique database key for this specific term
      const safeExamName = examTerm.replace(/\s+/g, '_');
      const termKey = `savedSubjects_${safeExamName}`;

      await updateDoc(doc(db, "classes", selectedClassId), {
        [termKey]: validSchedule, // Saves specific dates/times for this term
        savedSubjects: validSchedule // Keeps a generic fallback base list
      });
      
      setClasses(classes.map(c => c.id === selectedClassId ? { ...c, [termKey]: validSchedule, savedSubjects: validSchedule } : c));
      alert(`${examTerm} schedule saved successfully!`);
    } catch (error) {
      console.error("Error saving subjects:", error);
      alert("Failed to save subjects.");
    }
  };

  const formatDOB = (dob) => {
    if (!dob) return "";
    const parts = dob.split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dob;
  };

  const handleGenerate = () => {
    if (!examTerm) return alert("Please select an Exam Term.");
    if (students.length === 0) return alert("No students found in this section.");
    if (schedule.length === 0 || !schedule[0].subject) return alert("Please add at least one subject.");
    setIsGenerating(true);
  };

  // Helper to find the active class object easily inside the render loop
  const currentActiveClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="pb-10 animate-fade-in">
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-area { display: block !important; width: 100%; padding: 10mm; }
          .page-break { page-break-after: always; }
        `}
      </style>

      <div className={isGenerating ? "no-print" : "block"}>
        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Batch Admit Card Generator</h1>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-[#003b8b] mb-4">1. Select Target Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Exam Term</label>
              <select 
                className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold"
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
                {currentActiveClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {loading && <p className="text-blue-600 font-bold animate-pulse mb-4">Fetching students...</p>}

          <div className="flex justify-between items-end border-t pt-6 mb-4">
            <h2 className="text-xl font-bold text-[#003b8b]">2. Define Exam Schedule</h2>
            <button 
              onClick={saveSubjectsToClass} 
              disabled={!selectedClassId}
              className="bg-green-100 text-green-700 border border-green-300 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition outline-none text-sm"
            >
              💾 Save Subjects to Class
            </button>
          </div>
          
          <div className="space-y-3 mb-4">
            {schedule.map((row, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-3 items-center">
                <input 
                  type="text" placeholder="Subject Name (e.g. Mathematics)" 
                  className="flex-1 border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-medium w-full"
                  value={row.subject} onChange={(e) => handleScheduleChange(index, "subject", e.target.value)}
                />
                <input 
                  type="date" 
                  className="w-full md:w-48 border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-medium uppercase"
                  value={row.date} onChange={(e) => handleScheduleChange(index, "date", e.target.value)}
                />
                <input 
                  type="time" 
                  className="w-full md:w-40 border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-medium"
                  value={row.time} onChange={(e) => handleScheduleChange(index, "time", e.target.value)}
                />
                {schedule.length > 1 && (
                  <button onClick={() => removeSubjectRow(index)} className="w-full md:w-auto bg-red-100 text-red-600 px-4 py-3 rounded-lg font-bold hover:bg-red-200 transition outline-none">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button onClick={addSubjectRow} className="text-[#003b8b] font-bold bg-blue-50 px-4 py-2 rounded border border-blue-200 hover:bg-blue-100 transition outline-none mb-8">
            + Add Another Subject
          </button>

          <div className="border-t pt-6 flex justify-end">
            <button 
              onClick={handleGenerate} 
              className="bg-[#003b8b] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-900 transition shadow-lg outline-none w-full md:w-auto"
            >
              Generate {students.length > 0 ? students.length : ""} Admit Cards
            </button>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="absolute inset-0 bg-white z-50 print-area pb-20">
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white no-print sticky top-0 z-10 shadow-md">
            <h3 className="font-bold">Batch Admit Card Preview ({students.length} Students)</h3>
            <div className="flex gap-4">
              <button onClick={() => window.print()} className="bg-blue-600 px-6 py-2 rounded font-bold hover:bg-blue-500 flex items-center gap-2 shadow-sm">
                <span>🖨️</span> Print All
              </button>
              <button onClick={() => setIsGenerating(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold outline-none">
                Cancel
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            {students.map((student, idx) => (
              <div key={student.id} className={`bg-white pt-8 max-w-2xl mx-auto w-full ${idx !== students.length - 1 ? 'page-break' : ''}`}>
                <div className="border-4 border-double border-gray-800 p-6 rounded-lg h-full relative" style={{fontFamily: "Arial, sans-serif"}}>
                  
                  <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="w-24 h-24 flex items-center justify-center border-2 border-gray-300 rounded overflow-hidden p-1 flex-shrink-0">
                      <img src="/logo.jpg" alt="School Logo" className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="flex-1 text-center px-4">
                      <h1 className="text-2xl font-bold tracking-wider uppercase mb-1" style={{color: "#8B0000"}}>Koshi Competitive English School</h1>
                      <p className="text-sm font-medium mb-2">Near Durga Mandir, Rambagh (Purnea)</p>
                      <div className="inline-block bg-gray-800 text-white px-6 py-1 font-bold text-lg rounded-full uppercase tracking-widest mt-1" style={{ backgroundColor: "#1f2937" }}>
                        ADMIT CARD
                      </div>
                      <p className="font-bold mt-2 uppercase text-blue-900 tracking-wide">{examTerm}</p>
                    </div>

                    <div className="w-24 flex-shrink-0 hidden sm:block opacity-0"></div>
                  </div>

                  <div className="flex justify-between items-start mb-8 gap-4">
                    <div className="grid grid-cols-2 gap-y-4 text-sm font-medium flex-1">
                      <div>Student Name: <span className="font-bold text-base ml-2 border-b border-dotted border-black px-2 uppercase">{student.studentName}</span></div>
                      <div>Roll No: <span className="font-bold text-base ml-2 border-b border-dotted border-black px-2">{student.rollNo}</span></div>
                      <div>Class: <span className="font-bold text-base ml-2 border-b border-dotted border-black px-2 uppercase">{currentActiveClass?.name}</span></div>
                      <div>Section: <span className="font-bold text-base ml-2 border-b border-dotted border-black px-2 uppercase">{student.section}</span></div>
                      <div>Father's Name: <span className="font-bold text-base ml-2 border-b border-dotted border-black px-2 uppercase">{student.fatherName}</span></div>
                      <div>D.O.B: <span className="font-bold text-base ml-2 border-b border-dotted border-black px-2">{formatDOB(student.dob)}</span></div>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      {student.profileImage ? (
                        <div className="w-24 h-28 border-2 border-gray-800 flex items-center justify-center overflow-hidden bg-white p-1">
                          <img src={student.profileImage} alt="Student Profile" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-24 h-28 border-2 border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-400 font-bold text-center p-2 bg-gray-50">
                          Paste Photo Here
                        </div>
                      )}
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-gray-800 mb-16 text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-800 p-2 text-left" style={{ backgroundColor: "#f3f4f6", width: "50%" }}>Subject</th>
                        <th className="border border-gray-800 p-2 text-center" style={{ backgroundColor: "#f3f4f6", width: "25%" }}>Date</th>
                        <th className="border border-gray-800 p-2 text-center" style={{ backgroundColor: "#f3f4f6", width: "25%" }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row, i) => {
                        let subjDate = "";
                        if (row.date) {
                          const parts = row.date.split('-');
                          subjDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : row.date;
                        }

                        let subjTime = "";
                        if (row.time) {
                          let [h, m] = row.time.split(':');
                          let ampm = "AM";
                          h = parseInt(h);
                          if(h >= 12){ ampm = "PM"; if(h > 12) h -= 12; }
                          if(h === 0) h = 12;
                          subjTime = `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                        }

                        return (
                          <tr key={i}>
                            <td className="border border-gray-800 p-3 font-bold uppercase">{row.subject}</td>
                            <td className="border border-gray-800 p-3 text-center font-medium">{subjDate}</td>
                            <td className="border border-gray-800 p-3 text-center font-medium">{subjTime}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex justify-between text-sm font-bold px-4">
                    <div className="border-t border-black w-32 text-center pt-1">Class Teacher</div>
                    <div className="border-t border-black w-32 text-center pt-1">Principal</div>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}