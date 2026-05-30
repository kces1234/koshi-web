import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminTeacherAttendance() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  
  // Default to current month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch all teachers for the dropdown
  useEffect(() => {
    const fetchTeachers = async () => {
      const snap = await getDocs(collection(db, "teachers"));
      const teacherList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort alphabetically
      teacherList.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
      setTeachers(teacherList);
    };
    fetchTeachers();
  }, []);

  // 2. Fetch all attendance for the selected teacher
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedTeacherId) {
        setAllRecords([]);
        return;
      }
      setLoading(true);
      try {
        const q = query(
          collection(db, "teacher_attendance"), 
          where("teacherId", "==", selectedTeacherId)
        );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => doc.data());
        setAllRecords(records);
      } catch (error) {
        console.error("Error fetching teacher attendance:", error);
      }
      setLoading(false);
    };
    fetchAttendance();
  }, [selectedTeacherId]);

  // 3. Filter Records locally by the selected month
  const monthlyRecords = allRecords.filter(record => {
    if (!record.date) return false;
    return record.date.substring(0, 7) === selectedMonth;
  });
  
  // Sort newest dates first
  monthlyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 4. Calculate Statistics
  const totalDays = monthlyRecords.length;
  const presentDays = monthlyRecords.filter(r => r.status === 'Present').length;
  const absentDays = monthlyRecords.filter(r => r.status === 'Absent').length;
  const holidayDays = monthlyRecords.filter(r => r.status === 'Holiday').length;
  
  // Exclude holidays from the final percentage score
  const validWorkingDays = totalDays - holidayDays;
  const attendancePercentage = validWorkingDays > 0 
    ? Math.round((presentDays / validWorkingDays) * 100) 
    : 0;

  const activeTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Staff Monthly Attendance Report</h1>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-wrap md:flex-nowrap gap-6 items-end">
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Staff Member</label>
          <select 
            className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold text-gray-800 transition shadow-sm cursor-pointer"
            value={selectedTeacherId} 
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            <option value="">-- Choose Teacher --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.teacherName} (ID: {t.username})</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/2">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Month</label>
          <input 
            type="month" 
            className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold text-gray-800 transition shadow-sm cursor-pointer"
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
          />
        </div>
      </div>

      {loading && <div className="p-8 text-center text-blue-600 font-bold animate-pulse text-lg">Fetching records from database...</div>}

      {/* DASHBOARD AND DATA */}
      {!loading && selectedTeacherId && (
        <div>
          {/* STATISTICS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Total Logged</div>
              <div className="text-4xl font-black text-gray-800">{totalDays}</div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
              <div className="text-green-600 text-xs font-bold uppercase tracking-wider mb-2">Present</div>
              <div className="text-4xl font-black text-green-700">{presentDays}</div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm text-center transform hover:-translate-y-1 transition duration-300">
              <div className="text-red-600 text-xs font-bold uppercase tracking-wider mb-2">Absent</div>
              <div className="text-4xl font-black text-red-700">{absentDays}</div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm text-center flex flex-col justify-center transform hover:-translate-y-1 transition duration-300">
              <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Attendance %</div>
              <div className="text-4xl font-black text-[#003b8b]">{attendancePercentage}%</div>
            </div>
          </div>

          {/* DETAILED LOG TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 p-4 flex flex-col md:flex-row justify-between items-center text-white font-bold gap-2">
              <span>Daily Log: {new Date(selectedMonth + "-01").toLocaleDateString('default', { month: 'long', year: 'numeric' })}</span>
              <span className="bg-slate-700 px-4 py-1 rounded-full text-sm font-medium border border-slate-600 text-blue-100">
                Staff: {activeTeacher?.teacherName}
              </span>
            </div>
            
            {monthlyRecords.length === 0 ? (
              <div className="p-10 text-center text-gray-500 font-bold text-lg">
                No attendance records found for this staff member in {selectedMonth}.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider border-b-2 border-gray-200">
                    <tr>
                      <th className="p-4 font-bold border-b w-1/3">Date</th>
                      <th className="p-4 font-bold border-b text-center w-1/3">Status</th>
                      <th className="p-4 font-bold border-b text-right w-1/3">Recorded At</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {monthlyRecords.map((record, index) => {
                      const displayDate = record.date.split("-").reverse().join("-");
                      return (
                        <tr key={index} className="border-b hover:bg-gray-50 transition duration-150">
                          <td className="p-4 font-bold text-gray-800">{displayDate}</td>
                          <td className="p-4 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                              ${record.status === 'Present' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                record.status === 'Absent' ? 'bg-red-100 text-red-700 border border-red-200' : 
                                'bg-yellow-100 text-yellow-800 border border-yellow-200'}
                            `}>
                              {record.status}
                            </span>
                          </td>
                          <td className="p-4 text-right text-gray-500 font-medium text-xs">
                            {record.timestamp ? new Date(record.timestamp.toDate()).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'}) : 'System Auth'}
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
      )}

      {/* EMPTY STATE PROMPT */}
      {!selectedTeacherId && !loading && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-10 md:p-16 text-center shadow-inner mt-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-200">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-2">Select a Staff Member</h3>
          <p className="text-blue-600 font-medium max-w-md mx-auto">Choose a teacher from the dropdown menu above to instantly view their monthly attendance report.</p>
        </div>
      )}
    </div>
  );
}