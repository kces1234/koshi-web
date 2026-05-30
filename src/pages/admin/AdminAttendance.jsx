import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState("students"); // 'students', 'teachers', 'reports'
  
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  
  // States
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  
  // Data Records
  const [studentRecords, setStudentRecords] = useState({});
  const [teacherStatus, setTeacherStatus] = useState("");
  
  // Report State
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 1. Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      const classSnap = await getDocs(collection(db, "classes"));
      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const teacherSnap = await getDocs(collection(db, "teachers"));
      setTeachers(teacherSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMasterData();
  }, []);

  // 2. Fetch Students when Class/Section changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId || !selectedSection) return;
      const q = query(collection(db, "students"), where("classId", "==", selectedClassId), where("section", "==", selectedSection));
      const snapshot = await getDocs(q);
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchStudents();
  }, [selectedClassId, selectedSection]);

  // 3. Fetch Specific Student Attendance (Override Mode)
  useEffect(() => {
    const fetchStudentAttendance = async () => {
      if (activeTab !== "students" || !selectedClassId || !selectedSection || !selectedDate) return;
      const docId = `${selectedClassId}_${selectedSection}_${selectedDate}`;
      const docSnap = await getDoc(doc(db, "attendance", docId));
      if (docSnap.exists()) setStudentRecords(docSnap.data().records || {});
      else setStudentRecords({});
    };
    fetchStudentAttendance();
  }, [selectedClassId, selectedSection, selectedDate, activeTab]);

  // 4. Fetch Specific Teacher Attendance (Override Mode)
  useEffect(() => {
    const fetchTeacherAttendance = async () => {
      if (activeTab !== "teachers" || !selectedTeacherId || !selectedDate) return;
      const docId = `${selectedTeacherId}_${selectedDate}`;
      const docSnap = await getDoc(doc(db, "teacher_attendance", docId));
      if (docSnap.exists()) setTeacherStatus(docSnap.data().status);
      else setTeacherStatus("");
    };
    fetchTeacherAttendance();
  }, [selectedTeacherId, selectedDate, activeTab]);

  // --- SAVE FUNCTIONS ---
  const handleSaveStudentAttendance = async () => {
    setLoading(true);
    try {
      const activeClass = classes.find(c => c.id === selectedClassId);
      const docId = `${selectedClassId}_${selectedSection}_${selectedDate}`;
      await setDoc(doc(db, "attendance", docId), {
        classId: selectedClassId, className: activeClass?.name, section: selectedSection,
        date: selectedDate, markedBy: "SUPER ADMIN", records: studentRecords, updatedAt: serverTimestamp()
      }, { merge: true });
      showMessage("Student Attendance Overwritten Successfully!");
    } catch (e) { showMessage("Error saving.", true); }
    setLoading(false);
  };

  const handleSaveTeacherAttendance = async (status) => {
    setLoading(true);
    try {
      const activeTeacher = teachers.find(t => t.id === selectedTeacherId);
      const docId = `${selectedTeacherId}_${selectedDate}`;
      await setDoc(doc(db, "teacher_attendance", docId), {
        teacherId: selectedTeacherId, teacherName: activeTeacher?.teacherName,
        date: selectedDate, status: status, markedBy: "SUPER ADMIN", timestamp: serverTimestamp()
      }, { merge: true });
      setTeacherStatus(status);
      showMessage("Teacher Attendance Logged Successfully!");
    } catch (e) { showMessage("Error saving.", true); }
    setLoading(false);
  };

  // --- EXPORT MONTHLY REPORT (CSV) ---
  // --- EXPORT MONTHLY REPORT (CSV) ---
  const handleExportReport = async () => {
    if (!selectedClassId || !selectedSection || !reportMonth) {
      alert("Select Class, Section, and Month first."); return;
    }
    setLoading(true);
    try {
      // Get all days in the selected month
      const [year, month] = reportMonth.split("-");
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // FIX: Query only by Class and Section to avoid Firebase Index errors, 
      // then filter the dates manually in Javascript!
      const q = query(
        collection(db, "attendance"), 
        where("classId", "==", selectedClassId), 
        where("section", "==", selectedSection)
      );
      const snap = await getDocs(q);
      
      // Map data: { "YYYY-MM-DD": { studentId: "Present", ... } }
      const monthData = {};
      snap.forEach(doc => { 
        const recordDate = doc.data().date;
        // Only grab records that match our selected YYYY-MM
        if (recordDate && recordDate.startsWith(reportMonth)) {
          monthData[recordDate] = doc.data().records; 
        }
      });

      // Build CSV String
      let csvContent = `Monthly Attendance Report, ${reportMonth}\n`;
      csvContent += `Class:, ${classes.find(c => c.id === selectedClassId)?.name}, Section:, ${selectedSection}\n\n`;
      
      // Headers
      let headers = ["Roll No", "Student Name"];
      for(let i=1; i<=daysInMonth; i++) headers.push(`Day ${i}`);
      headers.push("Total Present", "Total Absent", "Total Holidays");
      csvContent += headers.join(",") + "\n";

      // Rows
      students.forEach(student => {
        let row = [`${student.rollNo}`, `"${student.studentName}"`];
        let present = 0, absent = 0, holiday = 0;

        for(let i=1; i<=daysInMonth; i++) {
          const dateStr = `${reportMonth}-${String(i).padStart(2, '0')}`;
          const status = monthData[dateStr] ? monthData[dateStr][student.id] : "-";
          
          if (status === "Present") { present++; row.push("P"); }
          else if (status === "Absent") { absent++; row.push("A"); }
          else if (status === "Holiday") { holiday++; row.push("H"); }
          else row.push("-"); // Not marked
        }
        row.push(present, absent, holiday);
        csvContent += row.join(",") + "\n";
      });

      // Trigger Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Attendance_${selectedSection}_${reportMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showMessage("Report Downloaded Successfully!");
    } catch (e) { 
      console.error("Export Error:", e);
      showMessage("Error generating report. Check console.", true); 
    }
    setLoading(false);
  };

  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const activeClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Master Attendance Control</h1>
        {message && <div className="bg-slate-800 text-white px-4 py-2 rounded shadow font-medium animate-pulse">{message}</div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-200 p-1 rounded-lg w-fit">
        <button onClick={() => setActiveTab("students")} className={`px-6 py-2 rounded-md font-bold transition ${activeTab === 'students' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>Students Override</button>
        <button onClick={() => setActiveTab("teachers")} className={`px-6 py-2 rounded-md font-bold transition ${activeTab === 'teachers' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>Teachers Override</button>
        <button onClick={() => setActiveTab("reports")} className={`px-6 py-2 rounded-md font-bold transition ${activeTab === 'reports' ? 'bg-white text-green-700 shadow' : 'text-gray-600 hover:bg-gray-300'}`}>Monthly Reports (Excel)</button>
      </div>

      {/* =========================================
          TAB 1: STUDENT ATTENDANCE OVERRIDE
      ========================================= */}
      {activeTab === "students" && (
        <div className="animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Target Date</label>
              <input type="date" className="border p-2 rounded outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
              <select className="border p-2 rounded w-48 outline-none focus:ring-2 focus:ring-blue-400"
                value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}>
                <option value="">-- Choose --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
              <select className="border p-2 rounded w-48 outline-none focus:ring-2 focus:ring-blue-400"
                value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClassId}>
                <option value="">-- Choose --</option>
                {activeClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="ml-auto flex gap-2">
              <button onClick={() => { const obj={}; students.forEach(s => obj[s.id]="Present"); setStudentRecords(obj); }} className="bg-green-100 text-green-700 px-3 py-2 rounded font-bold hover:bg-green-200">All Present</button>
              <button onClick={() => { const obj={}; students.forEach(s => obj[s.id]="Holiday"); setStudentRecords(obj); }} className="bg-purple-100 text-purple-700 px-3 py-2 rounded font-bold hover:bg-purple-200">Set Holiday</button>
            </div>
          </div>

          {selectedClassId && selectedSection && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700">
                  <tr><th className="p-4 border-b w-24">Roll No</th><th className="p-4 border-b">Name</th><th className="p-4 border-b text-center">Status</th></tr>
                </thead>
                <tbody>
                  {students.map(student => {
                    const status = studentRecords[student.id];
                    return (
                      <tr key={student.id} className="border-b">
                        <td className="p-4 font-bold text-gray-700">{student.rollNo}</td>
                        <td className="p-4">{student.studentName}</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => setStudentRecords(p => ({...p, [student.id]: "Present"}))} className={`px-3 py-1 rounded-full text-xs font-bold border ${status === 'Present' ? 'bg-green-500 text-white' : 'text-gray-500'}`}>Present</button>
                            <button onClick={() => setStudentRecords(p => ({...p, [student.id]: "Absent"}))} className={`px-3 py-1 rounded-full text-xs font-bold border ${status === 'Absent' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Absent</button>
                            <button onClick={() => setStudentRecords(p => ({...p, [student.id]: "Holiday"}))} className={`px-3 py-1 rounded-full text-xs font-bold border ${status === 'Holiday' ? 'bg-purple-500 text-white' : 'text-gray-500'}`}>Holiday</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="p-4 bg-gray-50 flex justify-end">
                <button onClick={handleSaveStudentAttendance} disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded font-bold shadow hover:bg-blue-700">
                  {loading ? "Saving..." : "Force Override Attendance"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================
          TAB 2: TEACHER ATTENDANCE OVERRIDE
      ========================================= */}
      {activeTab === "teachers" && (
        <div className="animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex gap-4 items-end max-w-3xl">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Target Date</label>
              <input type="date" className="border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Select Staff Member</label>
              <select className="border p-2 rounded w-full outline-none focus:ring-2 focus:ring-indigo-400"
                value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                <option value="">-- Choose Teacher --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.teacherName} ({t.className})</option>)}
              </select>
            </div>
          </div>

          {selectedTeacherId && (
            <div className="mt-6 bg-white p-8 rounded-lg shadow-sm border border-indigo-100 max-w-3xl text-center">
              <h3 className="text-xl font-bold mb-6 text-gray-800">
                Current Status: <span className={teacherStatus === 'Present' ? 'text-green-600' : teacherStatus === 'Absent' ? 'text-red-600' : teacherStatus === 'Holiday' ? 'text-purple-600' : 'text-gray-400'}>{teacherStatus || "Not Marked"}</span>
              </h3>
              <div className="flex justify-center gap-4">
                <button onClick={() => handleSaveTeacherAttendance("Present")} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow transition">Mark Present</button>
                <button onClick={() => handleSaveTeacherAttendance("Absent")} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow transition">Mark Absent</button>
                <button onClick={() => handleSaveTeacherAttendance("Holiday")} className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg shadow transition">Declare Holiday</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================
          TAB 3: MONTHLY REPORTS (EXCEL)
      ========================================= */}
      {activeTab === "reports" && (
        <div className="animate-fade-in max-w-3xl">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-green-100">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Generate Monthly Report</h2>
            <p className="text-gray-500 mb-8">Download a complete CSV (Excel) breakdown of daily attendance for any class.</p>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Select Month</label>
                <input type="month" className="border-2 border-green-200 p-3 rounded-lg w-full outline-none focus:border-green-500 text-lg font-bold"
                  value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
                <select className="border-2 border-gray-200 p-3 rounded-lg w-full outline-none focus:border-green-500"
                  value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}>
                  <option value="">-- Choose --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
                <select className="border-2 border-gray-200 p-3 rounded-lg w-full outline-none focus:border-green-500"
                  value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClassId}>
                  <option value="">-- Choose --</option>
                  {activeClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleExportReport} 
              disabled={loading || !selectedSection || !reportMonth}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3
                ${(!selectedSection || !reportMonth) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            >
              {loading ? "Compiling Report..." : "📥 Download Excel Sheet (.csv)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}