import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function TeacherMyAttendance() {
  const [teacher, setTeacher] = useState(null);
  const [allRecords, setAllRecords] = useState([]);
  
  // Default to the current month (Format: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  // 1. Load the logged-in teacher's profile
  useEffect(() => {
    const data = localStorage.getItem("teacherAuth");
    if (data) {
      setTeacher(JSON.parse(data));
    } else {
      setLoading(false); // Failsafe if not logged in
    }
  }, []);

  // 2. Fetch Attendance Records from Firebase
  useEffect(() => {
    const fetchMyAttendance = async () => {
      if (!teacher) return;
      setLoading(true);

      try {
        // Query the "teacher_attendance" collection for THIS specific teacher
        const q = query(
          collection(db, "teacher_attendance"), 
          where("teacherId", "==", teacher.id)
        );
        
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => doc.data());
        
        // Sort newest first
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAllRecords(records);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
      
      setLoading(false);
    };

    fetchMyAttendance();
  }, [teacher]);

  // 3. Filter Records by Selected Month
  const monthlyRecords = allRecords.filter(record => {
    if (!record.date) return false;
    // Extract YYYY-MM from the record's YYYY-MM-DD date
    const recordMonth = record.date.substring(0, 7);
    return recordMonth === selectedMonth;
  });

  // 4. Calculate Statistics
  const totalDays = monthlyRecords.length;
  const presentDays = monthlyRecords.filter(r => r.status === 'Present').length;
  const absentDays = monthlyRecords.filter(r => r.status === 'Absent').length;
  const holidayDays = monthlyRecords.filter(r => r.status === 'Holiday').length;
  
  // Calculate percentage (excluding holidays from the total required days)
  const validWorkingDays = totalDays - holidayDays;
  const attendancePercentage = validWorkingDays > 0 
    ? Math.round((presentDays / validWorkingDays) * 100) 
    : 0;

  if (loading) {
    return <div className="p-8 font-bold text-blue-600 animate-pulse text-center">Loading Attendance Records...</div>;
  }

  if (!teacher) {
    return <div className="p-8 font-bold text-red-500 text-center">Error: Unauthorized Access. Please log in again.</div>;
  }

  return (
    <div className="pb-10 max-w-5xl mx-auto px-4 md:px-0 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 border-b pb-4">My Attendance Report</h1>

      {/* FILTER BAR */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-4 w-full md:w-auto bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="w-12 h-12 bg-[#003b8b] text-white rounded-full flex items-center justify-center font-bold text-xl uppercase shadow-md">
            {teacher.teacherName?.charAt(0) || "T"}
          </div>
          <div>
            <div className="text-xs font-bold text-blue-500 uppercase tracking-wider">Staff Member</div>
            <div className="font-bold text-blue-900 text-lg leading-tight">{teacher.teacherName}</div>
          </div>
        </div>

        <div className="w-full md:w-auto text-center md:text-left">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Month</label>
          <input 
            type="month" 
            className="w-full md:w-48 border-2 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold text-gray-700 shadow-sm"
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
          />
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Logged</div>
          <div className="text-3xl font-black text-gray-800">{totalDays}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
          <div className="text-green-600 text-xs font-bold uppercase tracking-wider mb-2">Present</div>
          <div className="text-3xl font-black text-green-700">{presentDays}</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
          <div className="text-red-600 text-xs font-bold uppercase tracking-wider mb-2">Absent</div>
          <div className="text-3xl font-black text-red-700">{absentDays}</div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300 flex flex-col justify-center">
          <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Attendance %</div>
          <div className="text-3xl font-black text-[#003b8b]">{attendancePercentage}%</div>
        </div>
      </div>

      {/* DETAILED LOG TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-800 p-4 text-white font-bold">
          Daily Log: {new Date(selectedMonth + "-01").toLocaleDateString('default', { month: 'long', year: 'numeric' })}
        </div>
        
        {monthlyRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-bold">
            No attendance records found for this month.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[400px]">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold border-b">Date</th>
                  <th className="p-4 font-bold border-b text-center">Status</th>
                  <th className="p-4 font-bold border-b text-right">Recorded At</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {monthlyRecords.map((record, index) => {
                  // Format the date nicely (e.g., 28-05-2026)
                  const displayDate = record.date.split("-").reverse().join("-");
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4 font-bold text-gray-800">{displayDate}</td>
                      <td className="p-4 text-center">
                        <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                          ${record.status === 'Present' ? 'bg-green-100 text-green-700 border border-green-200' : 
                            record.status === 'Absent' ? 'bg-red-100 text-red-700 border border-red-200' : 
                            'bg-yellow-100 text-yellow-800 border border-yellow-200'}
                        `}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-500 font-medium text-xs">
                        {record.timestamp ? new Date(record.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'System Auth'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}