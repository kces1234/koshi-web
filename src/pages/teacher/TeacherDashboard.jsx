import { useState, useEffect } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get today's date in YYYY-MM-DD format based on local time
  const today = new Date().toLocaleDateString('en-CA'); 

  useEffect(() => {
    const data = localStorage.getItem("teacherAuth");
    if (data) {
      const parsedData = JSON.parse(data);
      setTeacher(parsedData);
      checkTodaysAttendance(parsedData.id);
    }
  }, []);

  // Check if the teacher has already marked attendance today
  const checkTodaysAttendance = async (teacherId) => {
    try {
      const docId = `${teacherId}_${today}`;
      const attDoc = await getDoc(doc(db, "teacher_attendance", docId));
      if (attDoc.exists()) {
        setHasCheckedIn(true);
      }
    } catch (error) {
      console.error("Error checking attendance:", error);
    }
  };

  // Handle the Daily Check-In
  const handleCheckIn = async () => {
    if (!teacher || hasCheckedIn) return;
    setLoading(true);

    try {
      const docId = `${teacher.id}_${today}`;
      
      await setDoc(doc(db, "teacher_attendance", docId), {
        teacherId: teacher.id,
        teacherName: teacher.teacherName,
        date: today,
        status: "Present", // Automatically marks them as present when they click
        timestamp: serverTimestamp()
      });

      setHasCheckedIn(true);
    } catch (error) {
      console.error("Error saving check-in:", error);
      alert("Failed to record check-in. Please try again.");
    }
    
    setLoading(false);
  };

  if (!teacher) {
    return <div className="p-8 font-bold text-gray-500 animate-pulse">Loading Dashboard...</div>;
  }

  return (
    <div className="pb-10 max-w-5xl mx-auto px-4 md:px-0 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome, {teacher.teacherName}!</h1>
      <p className="text-gray-500 mb-8 border-b pb-4">Have a great day teaching at Koshi Competitive English School.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* DAILY CHECK-IN CARD */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-blue-100 text-[#003b8b] rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">
            📅
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Daily Attendance</h2>
          <p className="text-gray-500 text-sm mb-6">Record your presence for today: <strong className="text-gray-700">{new Date().toLocaleDateString('en-GB')}</strong></p>
          
          {hasCheckedIn ? (
            <div className="bg-green-100 text-green-800 w-full py-4 rounded-xl font-bold border border-green-200 flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Checked In Successfully!
            </div>
          ) : (
            <button 
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full bg-[#003b8b] text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-900 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 outline-none"
            >
              {loading ? "Recording..." : "Check In Now"}
            </button>
          )}
        </div>

        {/* ASSIGNED CLASS INFO CARD */}
        <div className="bg-gradient-to-br from-[#003b8b] to-blue-900 p-6 md:p-8 rounded-2xl shadow-md text-white flex flex-col justify-center">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-1">Assigned Class</h2>
              <div className="text-3xl font-black">{teacher.className}</div>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center font-bold text-2xl backdrop-blur-sm border border-white/30">
              {teacher.section}
            </div>
          </div>
          
          <div className="bg-white/10 p-4 rounded-xl border border-white/20">
            <h3 className="font-bold mb-1">Your Responsibilities:</h3>
            <ul className="text-sm text-blue-100 space-y-1 ml-4 list-disc marker:text-[#ffd000]">
              <li>Mark student attendance daily.</li>
              <li>Maintain classroom discipline.</li>
              <li>Check your monthly attendance report.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}