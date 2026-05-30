import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function StudentAttendance() {
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Stores { studentId: "Present" | "Absent" | "Holiday" }
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  // 1. Load Teacher from Secure Local Storage
  useEffect(() => {
    const data = localStorage.getItem("teacherAuth");
    if (data) setTeacher(JSON.parse(data));
  }, []);

  // 2. Fetch Students & Check Existing Attendance (Locked to Teacher's Class)
  useEffect(() => {
    const fetchData = async () => {
      // Security Check: Ensure teacher is loaded before fetching
      if (!teacher || !date) {
        setStudents([]); setAttendance({}); return;
      }
      setLoading(true);

      try {
        // Fetch Students ONLY for this teacher's assigned class/section
        const qStudents = query(
          collection(db, "students"), 
          where("classId", "==", teacher.classId), 
          where("section", "==", teacher.section)
        );
        const snapStudents = await getDocs(qStudents);
        const studentData = snapStudents.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort students logically by Roll Number
        studentData.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
        setStudents(studentData);

        // Fetch Existing Attendance for this specific date
        const docId = `${teacher.classId}_${teacher.section}_${date}`;
        const attDoc = await getDoc(doc(db, "attendance", docId));

        if (attDoc.exists()) {
          setAttendance(attDoc.data().records || {});
        } else {
          // Reset if no attendance exists yet today
          setAttendance({});
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };
    fetchData();
  }, [teacher, date]);

  // Touch handlers
  const markStudent = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const newAtt = {};
    students.forEach(s => { newAtt[s.id] = status; });
    setAttendance(newAtt);
  };

  const saveAttendance = async () => {
    if (Object.keys(attendance).length !== students.length) {
      return alert("Please mark attendance for all students before saving.");
    }

    setLoading(true);
    try {
      const docId = `${teacher.classId}_${teacher.section}_${date}`;
      
      await setDoc(doc(db, "attendance", docId), {
        classId: teacher.classId,
        className: teacher.className,
        section: teacher.section,
        date: date,
        markedBy: teacher.teacherName, // Logs exactly who marked it
        teacherId: teacher.id,
        records: attendance, 
        updatedAt: serverTimestamp()
      }, { merge: true }); // Merge allows for updating mistakes later in the day

      alert("Attendance Saved Successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to save attendance.");
    }
    setLoading(false);
  };

  // Wait for auth to load
  if (!teacher) return <div className="p-8 font-bold text-gray-500">Authenticating...</div>;

  return (
    <div className="pb-10 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Take Attendance</h1>

      {/* CONTROLS (Locked to Teacher's Class) */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Date Selector */}
        <div className="w-full md:w-auto">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Date</label>
          <input type="date" className="w-full border-2 p-3 rounded-lg outline-none focus:border-blue-500 font-bold text-gray-700"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Read-Only Assigned Class Info */}
        <div className="w-full md:w-auto flex-1 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between md:justify-end gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-blue-500 uppercase tracking-wider">Assigned Class</div>
            <div className="font-bold text-blue-900 text-lg">{teacher.className} - Sec {teacher.section}</div>
          </div>
          <div className="w-12 h-12 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold text-xl">
            {teacher.section}
          </div>
        </div>

      </div>

      {/* STUDENT TOUCH CARDS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="bg-slate-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white font-bold text-center md:text-left">
            {students.length} Students Enrolled
          </div>
          {/* Quick Actions */}
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => markAll('Present')} className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold text-sm outline-none shadow">
              All Present
            </button>
            <button onClick={() => markAll('Holiday')} className="flex-1 md:flex-none bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded font-bold text-sm outline-none shadow">
              Mark Holiday
            </button>
          </div>
        </div>

        <div className="p-2 md:p-6 bg-gray-50 space-y-3">
          {loading ? (
            <p className="text-center text-blue-500 py-8 font-bold animate-pulse">Loading Roster...</p>
          ) : students.length === 0 ? (
            <p className="text-center text-gray-500 py-8 font-bold">No students found in your section.</p>
          ) : (
            students.map(student => (
              <div key={student.id} className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Student Info */}
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-800 font-black w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    {student.rollNo}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 uppercase text-sm md:text-base leading-tight">{student.studentName}</div>
                  </div>
                </div>

                {/* Touch Buttons */}
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1 h-12 md:h-10">
                  {['Present', 'Absent', 'Holiday'].map(status => (
                    <button
                      key={status}
                      onClick={() => markStudent(student.id, status)}
                      className={`flex-1 md:w-24 font-bold rounded-md transition-all outline-none text-xs md:text-sm ${
                        attendance[student.id] === status
                          ? status === 'Present' ? 'bg-green-500 text-white shadow-md transform scale-105'
                          : status === 'Absent' ? 'bg-red-500 text-white shadow-md transform scale-105'
                          : 'bg-yellow-500 text-white shadow-md transform scale-105'
                          : 'text-gray-500 hover:bg-gray-200 bg-transparent'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Save Footer */}
        {students.length > 0 && (
          <div className="p-4 md:p-6 bg-white border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm font-bold text-gray-500 w-full md:w-auto text-center md:text-left">
              Marked: {Object.keys(attendance).length} / {students.length}
            </div>
            <button 
              onClick={saveAttendance} 
              disabled={loading}
              className="w-full md:w-auto bg-[#003b8b] hover:bg-blue-900 text-white px-8 py-4 md:py-3 rounded-xl font-bold text-lg md:text-base shadow-lg transition outline-none"
            >
              {loading ? "Saving Data..." : "Save Daily Attendance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}