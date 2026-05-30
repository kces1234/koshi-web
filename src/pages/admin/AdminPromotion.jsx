import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminPromotion() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
  // "Promote FROM" State
  const [fromClassId, setFromClassId] = useState("");
  const [fromSection, setFromSection] = useState("");
  
  // "Promote TO" State
  const [toClassId, setToClassId] = useState("");
  const [toSection, setToSection] = useState("");

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [wipingDatabase, setWipingDatabase] = useState(false);

  // 1. Fetch Classes
  useEffect(() => {
    const fetchClasses = async () => {
      const snap = await getDocs(collection(db, "classes"));
      setClasses(snap.docs.map(c => ({ id: c.id, ...c.data() })));
    };
    fetchClasses();
  }, []);

  // 2. Fetch Students from the "FROM" class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!fromClassId || !fromSection) {
        setStudents([]);
        setSelectedStudents([]);
        return;
      }
      setLoading(true);
      const q = query(collection(db, "students"), where("classId", "==", fromClassId), where("section", "==", fromSection));
      const snap = await getDocs(q);
      const studentData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort by Roll No
      studentData.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
      setStudents(studentData);
      
      // Auto-select all students by default
      setSelectedStudents(studentData.map(s => s.id));
      setLoading(false);
    };
    fetchStudents();
  }, [fromClassId, fromSection]);

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // --- ACTION 1: PROMOTE STUDENTS ---
  const handlePromote = async () => {
    if (!toClassId || !toSection) return alert("Please select a destination Class and Section.");
    if (selectedStudents.length === 0) return alert("Please select at least one student to promote.");
    
    const confirmMsg = `Are you sure you want to promote ${selectedStudents.length} students?\n\nThis will permanently change their class.`;
    if (!window.confirm(confirmMsg)) return;

    setPromoting(true);
    try {
      const updatePromises = selectedStudents.map(studentId => {
        const studentRef = doc(db, "students", studentId);
        return updateDoc(studentRef, {
          classId: toClassId,
          section: toSection,
        });
      });

      await Promise.all(updatePromises);
      alert("Students successfully promoted!");
      
      setFromClassId(""); setFromSection("");
      setToClassId(""); setToSection("");
      setStudents([]); setSelectedStudents([]);
    } catch (error) {
      console.error("Error promoting students:", error);
      alert("Failed to promote students. Check console for details.");
    }
    setPromoting(false);
  };

  // --- ACTION 2: GRADUATE / REMOVE STUDENTS (Option A) ---
  const handleGraduate = async () => {
    if (selectedStudents.length === 0) return alert("Please select at least one student.");
    
    const confirmMsg = `⚠️ WARNING ⚠️\n\nAre you sure you want to PERMANENTLY DELETE ${selectedStudents.length} students?\n\nUse this only for graduating students (e.g. Class 8) or students leaving the school. This action CANNOT be undone!`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const deletePromises = selectedStudents.map(studentId => {
        return deleteDoc(doc(db, "students", studentId));
      });

      await Promise.all(deletePromises);
      alert("Students successfully removed from the database.");
      
      setFromClassId(""); setFromSection("");
      setStudents([]); setSelectedStudents([]);
    } catch (error) {
      console.error("Error deleting students:", error);
      alert("Failed to delete students.");
    }
    setDeleting(false);
  };

  // --- ACTION 3: WIPE DATABASE (Academic Year Reset) ---
  const handleDatabaseWipe = async () => {
    const confirmWipe = window.confirm(
      "🛑 DANGER ZONE 🛑\n\nThis will permanently delete ALL Student Attendance, ALL Teacher Attendance, and ALL Exam Results for the ENTIRE SCHOOL.\n\nOnly do this at the very end of the academic year. Continue?"
    );
    if (!confirmWipe) return;

    // Safety Lock
    const doubleCheck = window.prompt("To prevent accidental deletion, please type the word WIPE in the box below:");
    if (doubleCheck !== "WIPE") {
      return alert("Database cleanup cancelled. You did not type WIPE.");
    }

    setWipingDatabase(true);
    try {
      // 1. Wipe all Student Attendance Records
      const attendanceSnap = await getDocs(collection(db, "attendance"));
      const attendancePromises = attendanceSnap.docs.map(d => deleteDoc(doc(db, "attendance", d.id)));

      // 2. Wipe all Teacher Attendance Records
      const teacherAttendanceSnap = await getDocs(collection(db, "teacher_attendance")); // make sure this matches your collection name!
      const teacherAttendancePromises = teacherAttendanceSnap.docs.map(d => deleteDoc(doc(db, "teacher_attendance", d.id)));
      
      // 3. Wipe all Exam Results
      const examSnap = await getDocs(collection(db, "exam_results"));
      const examPromises = examSnap.docs.map(d => deleteDoc(doc(db, "exam_results", d.id)));

      // Execute all deletions together
      await Promise.all([...attendancePromises, ...teacherAttendancePromises, ...examPromises]);
      
      alert("Database successfully cleaned! Student attendance, teacher attendance, and exam results have been erased for the new academic year.");
    } catch (error) {
      console.error("Error wiping data:", error);
      alert("Failed to wipe database.");
    }
    setWipingDatabase(false);
  };

  const activeFromClass = classes.find(c => c.id === fromClassId);
  const activeToClass = classes.find(c => c.id === toClassId);

  return (
    <div className="pb-10 animate-fade-in max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">End of Year Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* LEFT SIDE: SELECT STUDENTS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-blue-500">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">1</span> 
            Select Students
          </h2>
          <div className="flex gap-4 mb-6">
            <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none font-bold"
              value={fromClassId} onChange={(e) => { setFromClassId(e.target.value); setFromSection(""); }}>
              <option value="">-- Choose Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-400 outline-none font-bold"
              value={fromSection} onChange={(e) => setFromSection(e.target.value)} disabled={!fromClassId}>
              <option value="">-- Section --</option>
              {activeFromClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center p-8 text-gray-500 font-bold animate-pulse">Loading Roster...</div>
          ) : (
            <div className="border rounded-lg max-h-[400px] overflow-y-auto bg-gray-50">
              {students.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic font-medium">Select a class to view students.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="p-3 w-10">
                        <input type="checkbox" className="w-4 h-4 cursor-pointer"
                          checked={selectedStudents.length === students.length}
                          onChange={(e) => setSelectedStudents(e.target.checked ? students.map(s => s.id) : [])}
                        />
                      </th>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Student Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.id} className="border-b hover:bg-white transition cursor-pointer" onClick={() => toggleStudentSelection(student.id)}>
                        <td className="p-3">
                          <input type="checkbox" className="w-4 h-4 cursor-pointer"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            onClick={(e) => e.stopPropagation()} 
                          />
                        </td>
                        <td className="p-3 font-bold text-gray-600">{student.rollNo}</td>
                        <td className="p-3 font-bold">{student.studentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <div className="mt-3 text-sm font-bold text-gray-600">
            Selected: {selectedStudents.length} / {students.length} Students
          </div>
        </div>

        {/* RIGHT SIDE: ACTIONS */}
        <div className="flex flex-col gap-6">
          
          {/* Action A: Promote */}
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-green-500">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-green-100 text-green-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">2A</span> 
              Promote to Next Class
            </h2>
            <div className="flex gap-4 mb-6">
              <select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-400 outline-none font-bold"
                value={toClassId} onChange={(e) => { setToClassId(e.target.value); setToSection(""); }}>
                <option value="">-- Target Class --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-400 outline-none font-bold"
                value={toSection} onChange={(e) => setToSection(e.target.value)} disabled={!toClassId}>
                <option value="">-- Target Section --</option>
                {activeToClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button 
              onClick={handlePromote}
              disabled={promoting || selectedStudents.length === 0 || !toClassId || !toSection}
              className={`w-full py-3 rounded-lg font-bold transition shadow ${
                (promoting || selectedStudents.length === 0 || !toClassId || !toSection) 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {promoting ? "Promoting..." : `Promote Selected Students 🚀`}
            </button>
          </div>

          {/* Action B: Graduate / Delete */}
          <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-red-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="bg-red-100 text-red-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">2B</span> 
              Graduate / Remove (Class 8)
            </h2>
            <p className="text-sm text-gray-500 mb-4 font-medium">Use this to permanently delete students from the database who have graduated or left the school.</p>
            <button 
              onClick={handleGraduate}
              disabled={deleting || selectedStudents.length === 0}
              className={`w-full py-3 rounded-lg font-bold transition shadow border ${
                (deleting || selectedStudents.length === 0) 
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-600'
              }`}
            >
              {deleting ? "Removing..." : `🗑️ Permanently Delete Selected`}
            </button>
          </div>

        </div>
      </div>

      {/* DANGER ZONE: DATABASE CLEANUP */}
      <div className="bg-red-50 border-2 border-red-600 p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-black text-red-700 mb-2">🛑 Database Danger Zone (Yearly Reset)</h2>
        <p className="text-red-900 font-medium mb-6">
          This action will permanently wipe out <strong>ALL Student Attendance</strong>, <strong>ALL Teacher Attendance</strong>, and <strong>ALL Exam Results</strong> for the entire school to clear space in your Firebase Free Tier for the new academic year. Student Profiles, Teachers, Classes, and Subjects will NOT be deleted. 
        </p>
        
        <button 
          onClick={handleDatabaseWipe}
          disabled={wipingDatabase}
          className={`px-8 py-3 rounded-lg font-bold text-lg transition shadow-lg border-2 border-red-700 ${
            wipingDatabase 
              ? 'bg-gray-400 text-white cursor-not-allowed border-gray-400' 
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {wipingDatabase ? "Wiping Database..." : "🔥 WIPE OLD ACADEMIC DATA 🔥"}
        </button>
      </div>

    </div>
  );
}