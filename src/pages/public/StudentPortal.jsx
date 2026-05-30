import { useState, useEffect } from "react";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useLocation, useNavigate } from "react-router-dom";

export default function StudentPortal() {
  const location = useLocation();
  const navigate = useNavigate();

  const mode = location.pathname.includes("admit") ? "admit" : location.pathname.includes("report") ? "report" : "attendance";

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [dob, setDob] = useState("");
  const [examName, setExamName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeData, setActiveData] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      const snap = await getDocs(collection(db, "classes"));
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setActiveData(null);

    try {
      const qStudent = query(collection(db, "students"),
        where("classId", "==", selectedClassId),
        where("section", "==", selectedSection)
      );
      const studentSnap = await getDocs(qStudent);

      const matchedStudentDoc = studentSnap.docs.find(doc =>
        String(doc.data().rollNo).trim() === String(rollNo).trim() ||
        Number(doc.data().rollNo) === Number(rollNo)
      );

      if (!matchedStudentDoc) {
        setError("No student found with this Roll Number in the selected class.");
        setLoading(false); return;
      }

      const student = { id: matchedStudentDoc.id, ...matchedStudentDoc.data() };

      if (student.dob !== dob) {
        setError("Invalid Date of Birth. Please check your records.");
        setLoading(false); return;
      }

      let result = null;
      let attendanceHistory = [];
      let admitSubjects = [];

      if (mode === "admit") {
        const classDocRef = doc(db, "classes", selectedClassId);
        const classDocSnap = await getDoc(classDocRef);

        if (classDocSnap.exists()) {
          const safeExamName = examName.replace(/\s+/g, '_');
          const termSpecificSchedule = classDocSnap.data()[`savedSubjects_${safeExamName}`];

          if (termSpecificSchedule && termSpecificSchedule.length > 0) {
            // 1. The SuperAdmin saved a schedule specifically for this term. Use it!
            admitSubjects = termSpecificSchedule;
          } else {
            // 2. No schedule for this term. Load the subjects, but WIPE the dates and times!
            const baseSubjects = classDocSnap.data().savedSubjects || [];
            admitSubjects = baseSubjects.map(sub => ({
              subject: typeof sub === 'string' ? sub : sub.subject,
              date: "", 
              time: ""
            }));
          }
        }

        if (admitSubjects.length === 0) {
          setError("The school has not published the exam schedule for this class yet.");
          setLoading(false); return;
        }
      }

      if (mode === "report") {
        const safeExamName = examName.replace(/\s+/g, '_');
        const resultDoc = await getDoc(doc(db, "exam_results", `${student.id}_${safeExamName}`));

        if (!resultDoc.exists()) {
          setError(`No results have been published for ${examName} yet.`);
          setLoading(false); return;
        }
        result = resultDoc.data();
      }

      if (mode === "attendance") {
        const attQuery = query(collection(db, "attendance"), where("classId", "==", selectedClassId), where("section", "==", selectedSection));
        const attSnap = await getDocs(attQuery);

        attSnap.forEach(doc => {
          const data = doc.data();
          if (data.records && data.records[student.id]) {
            attendanceHistory.push({
              date: data.date,
              status: data.records[student.id]
            });
          }
        });

        if (attendanceHistory.length === 0) {
          setError("No attendance records found for this class yet.");
          setLoading(false); return;
        }
        attendanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      setActiveData({
        student,
        result,
        attendance: attendanceHistory,
        subjects: admitSubjects,
        term: examName
      });

    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching your records.");
    }
    setLoading(false);
  };

  const handlePrint = () => window.print();
  const formatDOB = (dateStr) => dateStr ? dateStr.split("-").reverse().join("-") : "";
  const activeClass = classes.find(c => c.id === selectedClassId);
  const chartColors = ["#1e3a8a", "#b91c1c", "#0f766e", "#a16207", "#4338ca", "#be123c"];

  const attStats = activeData?.attendance ? {
    total: activeData.attendance.length,
    present: activeData.attendance.filter(a => a.status === 'Present').length,
    absent: activeData.attendance.filter(a => a.status === 'Absent').length,
    holiday: activeData.attendance.filter(a => a.status === 'Holiday').length,
  } : null;

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col items-center py-6 md:py-10 px-4">

      <style type="text/css" media="print">
        {`
          body * { visibility: hidden; }
          #printable-doc, #printable-doc * { visibility: visible; }
          @page { size: A4 portrait; margin: 0; }
          #printable-doc { 
            position: absolute !important; left: 0 !important; top: 0 !important; 
            width: 210mm !important; height: 296mm !important; box-sizing: border-box !important;
            margin: 0 !important; padding: 8mm !important; background: white;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; 
            overflow: hidden !important; 
          }
        `}
      </style>

      {!activeData && (
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden print:hidden">
          <div className="bg-[#003b8b] p-6 text-white text-center relative">
            <button onClick={() => navigate('/')} className="absolute left-4 top-6 text-blue-200 hover:text-white font-bold text-sm md:text-base">&larr; Home</button>
            <h2 className="text-xl md:text-2xl font-bold mt-4 md:mt-0">
              {mode === "admit" ? "Download Admit Card" : mode === "report" ? "Download Report Card" : "Check Attendance"}
            </h2>
            <p className="text-blue-200 text-xs md:text-sm mt-1">Enter your details to retrieve official records</p>
          </div>

          <form onSubmit={handleSearch} className="p-6 md:p-8 space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded font-medium text-center border border-red-200 text-sm">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
                <select required className="w-full border p-3 rounded outline-none focus:border-[#003b8b]"
                  value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}>
                  <option value="">-- Select --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
                <select required className="w-full border p-3 rounded outline-none focus:border-[#003b8b]"
                  value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClassId}>
                  <option value="">-- Select --</option>
                  {activeClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Roll Number</label>
                <input required type="text" className="w-full border p-3 rounded outline-none focus:border-[#003b8b] font-bold"
                  value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="e.g. 01" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date of Birth</label>
                <input required type="date" className="w-full border p-3 rounded outline-none focus:border-[#003b8b] font-bold"
                  value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>

            {mode !== "attendance" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Examination Term</label>
                <select
                  required
                  className="w-full border p-3 rounded outline-none focus:border-[#003b8b] font-bold bg-gray-50"
                  value={examName} onChange={(e) => setExamName(e.target.value)}
                >
                  <option value="">-- Select Term --</option>
                  <option value="Term 1 Examination">Term 1 Examination</option>
                  <option value="Term 2 Examination">Term 2 Examination</option>
                  <option value="Final Annual Examination">Final Annual Examination</option>
                </select>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-[#ffd000] text-black font-bold text-base md:text-lg py-3 rounded-lg hover:bg-yellow-500 transition shadow-md mt-4 outline-none">
              {loading ? "Searching Database..." : `Fetch ${mode === 'admit' ? 'Admit Card' : mode === 'report' ? 'Report Card' : 'Attendance'}`}
            </button>
          </form>
        </div>
      )}

      {activeData && (
        <div className="w-full max-w-4xl">

          <div className="bg-slate-900 p-4 flex flex-col sm:flex-row justify-between items-center text-white print:hidden rounded-t-lg shadow-lg gap-4">
            <h3 className="font-bold text-center sm:text-left">Your Official Document is Ready</h3>
            <div className="flex w-full sm:w-auto justify-between sm:justify-end items-center gap-4">
              <button onClick={handlePrint} className="flex-1 sm:flex-none bg-[#ffd000] text-black px-4 py-2 rounded font-bold hover:bg-yellow-500 flex items-center justify-center gap-2 shadow outline-none">
                <span>🖨️</span> Save PDF / Print
              </button>
              <button onClick={() => setActiveData(null)} className="bg-gray-700 text-white px-3 py-2 rounded hover:bg-red-500 font-bold ml-2 outline-none">Close &times;</button>
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-gray-100 rounded-b-lg shadow-inner custom-scrollbar">

            <div id="printable-doc" className="p-4 md:p-8 bg-white text-black shadow-2xl mx-auto min-w-[750px] md:min-w-0" style={{ fontFamily: "Arial, sans-serif" }}>

              {/* ========================================================= */}
              {/* ADMIT CARD LAYOUT                                         */}
              {/* ========================================================= */}
              {mode === "admit" && (
                <div className="border-4 border-double border-gray-800 p-6 rounded-lg max-w-2xl mx-auto mt-4">
                  
                  {/* HEADER - Centered Logo & Text ONLY */}
                  <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border-2 border-gray-300 rounded overflow-hidden p-1">
                     <img src="/logo.jpg" alt="School Logo" className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="flex-1 text-center px-4">
                      <h1 className="text-xl md:text-2xl font-bold tracking-wider uppercase mb-1" style={{color: "#8B0000"}}>Koshi Competitive English School</h1>
                      <p className="text-xs md:text-sm font-medium mb-2">Near Durga Mandir, Rambagh (Purnea)</p>
                      <div className="inline-block text-white px-4 md:px-6 py-1 font-bold text-base md:text-lg rounded-full uppercase tracking-widest mt-1" style={{ backgroundColor: "#1f2937" }}>
                        ADMIT CARD
                      </div>
                      <p className="font-bold mt-2 text-sm md:text-base uppercase text-blue-900 tracking-wide">{activeData.term}</p>
                    </div>

                    {/* Invisible Spacer to keep school text perfectly centered */}
                    <div className="w-20 md:w-24 hidden sm:block opacity-0"></div>
                  </div>

                  {/* INFO & PHOTO SECTION */}
                  <div className="flex justify-between items-start mb-8 gap-4">
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm font-medium flex-1">
                      <div>Student Name: <span className="font-bold text-sm md:text-base ml-2 border-b border-dotted border-black px-2 uppercase">{activeData.student.studentName}</span></div>
                      <div>Roll No: <span className="font-bold text-sm md:text-base ml-2 border-b border-dotted border-black px-2">{activeData.student.rollNo}</span></div>
                      <div>Class: <span className="font-bold text-sm md:text-base ml-2 border-b border-dotted border-black px-2 uppercase">{activeClass?.name}</span></div>
                      <div>Section: <span className="font-bold text-sm md:text-base ml-2 border-b border-dotted border-black px-2 uppercase">{activeData.student.section}</span></div>
                      <div>Father's Name: <span className="font-bold text-sm md:text-base ml-2 border-b border-dotted border-black px-2 uppercase">{activeData.student.fatherName}</span></div>
                      <div>D.O.B: <span className="font-bold text-sm md:text-base ml-2 border-b border-dotted border-black px-2">{formatDOB(activeData.student.dob)}</span></div>
                    </div>

                    <div className="flex-shrink-0 ml-2 md:ml-4">
                      {activeData.student.profileImage ? (
                        <div className="w-20 h-24 md:w-24 md:h-28 border-2 border-gray-800 flex items-center justify-center overflow-hidden bg-white p-1">
                          <img src={activeData.student.profileImage} alt="Student Profile" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-24 md:w-24 md:h-28 border-2 border-dashed border-gray-400 flex items-center justify-center text-[10px] md:text-xs text-gray-400 font-bold text-center p-2 bg-gray-50">
                          Paste Photo Here
                        </div>
                      )}
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-gray-800 mb-12 text-sm">
                    <thead>
                      <tr className="bg-gray-100" style={{ backgroundColor: "#f3f4f6" }}>
                        <th className="border border-gray-800 p-2 text-left w-1/2">Subject</th>
                        <th className="border border-gray-800 p-2 text-center w-1/4">Date</th>
                        <th className="border border-gray-800 p-2 text-center w-1/4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeData.subjects?.map((sub, i) => {
                        const isString = typeof sub === 'string';
                        const subjName = isString ? sub : sub.subject;

                        let subjDate = "";
                        if (!isString && sub.date) {
                          const parts = sub.date.split('-');
                          subjDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : sub.date;
                        }

                        let subjTime = "";
                        if (!isString && sub.time) {
                          let [h, m] = sub.time.split(':');
                          let ampm = "AM";
                          h = parseInt(h);
                          if (h >= 12) { ampm = "PM"; if (h > 12) h -= 12; }
                          if (h === 0) h = 12;
                          subjTime = `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                        }

                        return (
                          <tr key={i}>
                            <td className="border border-gray-800 p-3 font-bold uppercase">{subjName}</td>
                            <td className="border border-gray-800 p-3 text-center font-medium">{subjDate}</td>
                            <td className="border border-gray-800 p-3 text-center font-medium">{subjTime}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex justify-between text-sm font-bold mt-16 px-4">
                    <div className="border-t border-black w-24 md:w-32 text-center pt-1">Class Teacher</div>
                    <div className="border-t border-black w-24 md:w-32 text-center pt-1">Principal</div>
                  </div>
                </div>
              )}


              {/* ========================================================= */}
              {/* REPORT CARD LAYOUT                                        */}
              {/* ========================================================= */}
              {mode === "report" && activeData.result && (
                <div className="border border-gray-800 p-1">
                  <div className="border border-gray-800 p-4 relative">
                    
                    {/* HEADER - Centered Logo & Text ONLY */}
                    <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-3">
                      <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border-2 border-gray-300 rounded overflow-hidden p-1">
                        <img src="/logo.jpg" alt="School Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 text-center px-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-widest mb-1" style={{ fontFamily: "Times New Roman, serif", color: "#1e3a8a" }}>KOSHI COMPETITIVE ENGLISH SCHOOL</h1>
                        <p className="text-[10px] md:text-xs font-bold mb-2">Near Durga Mandir, Rambagh (Purnea) | Mob: 9122310366</p>
                        <div className="inline-block border-2 border-black px-4 py-1 font-bold text-sm md:text-base tracking-widest uppercase" style={{ backgroundColor: "#f3f4f6" }}>REPORT CARD</div>
                        <p className="text-[10px] md:text-xs font-bold mt-2 uppercase">ACADEMIC SESSION : {examName}</p>
                      </div>
                      <div className="w-20 h-20 md:w-24 md:h-24 hidden sm:block opacity-0"></div>
                    </div>

                    {/* INFO & PHOTO SECTION */}
                    <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-3 gap-2">
                      <div className="grid grid-cols-2 gap-1 text-[10px] md:text-xs font-bold flex-1">
                        <div>Name of Student: <span className="uppercase ml-2" style={{ color: "#1e3a8a" }}>{activeData.student.studentName}</span></div>
                        <div>Roll No: <span className="uppercase ml-2">{activeData.student.rollNo}</span></div>
                        <div>Father's Name: <span className="uppercase ml-2">{activeData.student.fatherName}</span></div>
                        <div>D.O.B: <span className="uppercase ml-2">{formatDOB(activeData.student.dob)}</span></div>
                        <div>Mother's Name: <span className="uppercase ml-2">{activeData.student.motherName}</span></div>
                        <div>Grade & Section: <span className="uppercase ml-2">{activeClass?.name} - {activeData.student.section}</span></div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-2">
                        {activeData.student.profileImage ? (
                          <div className="w-16 h-20 border-2 border-gray-800 flex items-center justify-center overflow-hidden bg-white p-1">
                            <img src={activeData.student.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-20 border-2 border-dashed border-gray-400 flex items-center justify-center text-[8px] text-gray-400 font-bold text-center p-1 bg-gray-50">
                            Photo
                          </div>
                        )}
                      </div>
                    </div>

                    <table className="w-full border-collapse border border-black mb-3 text-xs text-center font-bold">
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th className="border border-black p-1 text-left w-1/3">SUBJECTS</th>
                          <th className="border border-black p-1">Full Marks</th>
                          <th className="border border-black p-1">Passing Marks</th>
                          <th className="border border-black p-1">Marks Obtained</th>
                          <th className="border border-black p-1">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeData.result.subjects.map((sub, index) => (
                          <tr key={index}>
                            <td className="border border-black p-1 text-left uppercase">{sub.name}</td>
                            <td className="border border-black p-1">{sub.fullMarks}</td>
                            <td className="border border-black p-1 text-gray-500">{Math.ceil(sub.fullMarks * 0.33)}</td>
                            <td className="border border-black p-1">{sub.marksObtained}</td>
                            <td className="border border-black p-1" style={{ color: "#b91c1c" }}>{sub.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mb-4">
                      <div className="font-bold text-[10px] border border-black p-1 text-center mb-1" style={{ backgroundColor: "#e5e7eb" }}>Grade Scale for Scholastic Areas</div>
                      <table className="w-full border-collapse border border-black text-[10px] text-center font-bold">
                        <tbody>
                          <tr style={{ backgroundColor: "#f9fafb" }}>
                            <td className="border border-black p-1 w-20">Grade</td>
                            <td className="border border-black p-1 text-green-700">A1</td><td className="border border-black p-1 text-green-600">A2</td>
                            <td className="border border-black p-1 text-blue-700">B1</td><td className="border border-black p-1 text-blue-600">B2</td>
                            <td className="border border-black p-1">C1</td><td className="border border-black p-1">C2</td>
                            <td className="border border-black p-1 text-orange-600">D</td><td className="border border-black p-1 text-red-600">E</td>
                          </tr>
                          <tr>
                            <td className="border border-black p-1">Marks Range</td>
                            <td className="border border-black p-1">91-100</td><td className="border border-black p-1">81-90</td>
                            <td className="border border-black p-1">71-80</td><td className="border border-black p-1">61-70</td>
                            <td className="border border-black p-1">51-60</td><td className="border border-black p-1">41-50</td>
                            <td className="border border-black p-1">33-40</td><td className="border border-black p-1 text-[8px]" style={{ color: "#dc2626" }}>Needs Improvement</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <div className="font-bold text-[10px] text-center mb-2 uppercase tracking-widest">Subject Wise Statistical Analysis</div>
                      <div className="relative h-36 ml-10 w-[90%] mx-auto mt-2">
                        <div className="absolute inset-0 flex flex-col justify-between z-0 border-l-2 border-b-2 border-black">
                          {[100, 80, 60, 40, 20, 0].map((val, index) => (
                            <div key={val} className={`w-full relative ${index !== 5 ? 'border-t border-dashed border-gray-400' : ''}`}>
                              <span className="absolute -left-6 -top-2 text-[10px] font-bold text-gray-700">{val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 z-10 flex items-end justify-around px-2 pb-[1px]">
                          {activeData.result.subjects.map((sub, idx) => {
                            const percentage = Math.min((sub.marksObtained / sub.fullMarks) * 100, 100);
                            return (
                              <div key={idx} className="flex flex-col items-center justify-end h-full w-8 md:w-10">
                                <div className="w-6 md:w-8 border border-black relative" style={{ height: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length], boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.8)" }}>
                                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-black bg-white/90 px-1 rounded">{sub.marksObtained}</span>
                                </div>
                                <div className="absolute -bottom-6 text-[8px] md:text-[9px] font-bold mt-1 uppercase text-center w-12 md:w-14 leading-tight break-words">{sub.name}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-bold border-2 border-black p-3 mt-8">
                      <div>
                        <div className="mb-2">Attendance: <span className="border-b border-black ml-2 px-8 inline-block"></span></div>
                        <div>Result: <span className="border-b border-black ml-2 px-16 inline-block"></span></div>
                      </div>
                      <div className="flex justify-between items-end pl-8">
                        <div className="text-center pt-4 border-t border-black w-20 md:w-24">Class Teacher</div>
                        <div className="text-center pt-4 border-t border-black w-20 md:w-24">Principal</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ========================================================= */}
              {/* ATTENDANCE REPORT LAYOUT                                  */}
              {/* ========================================================= */}
              {mode === "attendance" && activeData.attendance && (
                <div className="border border-gray-800 p-2">
                  <div className="border border-gray-800 p-4 md:p-6 relative">

                    {/* HEADER - Centered Logo & Text ONLY */}
                    <div className="flex items-center justify-between mb-6 border-b-2 border-black pb-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center border border-gray-300 rounded p-1 bg-gray-50">
                        <img src="/logo.jpg" alt="School Logo" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 text-center px-4">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-widest text-blue-900 mb-1" style={{ fontFamily: "Times New Roman, serif", color: "#1e3a8a" }}>
                          KOSHI COMPETITIVE ENGLISH SCHOOL
                        </h1>
                        <div className="inline-block border-2 border-black px-4 py-1 font-bold tracking-widest uppercase bg-gray-100 mt-2" style={{ backgroundColor: "#f3f4f6" }}>
                          ATTENDANCE REPORT
                        </div>
                      </div>
                      <div className="w-16 h-16 md:w-20 md:h-20 hidden sm:block opacity-0"></div>
                    </div>

                    {/* INFO & PHOTO SECTION */}
                    <div className="flex justify-between items-start mb-6 gap-4">
                      <div className="grid grid-cols-2 gap-4 text-xs md:text-sm font-bold flex-1">
                        <div>Name: <span className="uppercase ml-2 border-b border-dotted border-black px-2">{activeData.student.studentName}</span></div>
                        <div>Roll No: <span className="uppercase ml-2 border-b border-dotted border-black px-2">{activeData.student.rollNo}</span></div>
                        <div>Class & Section: <span className="uppercase ml-2 border-b border-dotted border-black px-2">{activeClass?.name} - {activeData.student.section}</span></div>
                        <div>Date of Birth: <span className="uppercase ml-2 border-b border-dotted border-black px-2">{formatDOB(activeData.student.dob)}</span></div>
                      </div>

                      <div className="flex-shrink-0 ml-4">
                        {activeData.student.profileImage ? (
                          <div className="w-16 h-20 md:w-20 md:h-24 border-2 border-gray-800 flex items-center justify-center overflow-hidden bg-white p-1">
                            <img src={activeData.student.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-20 md:w-20 md:h-24 border-2 border-dashed border-gray-400 flex items-center justify-center text-[10px] text-gray-400 font-bold text-center p-1 bg-gray-50">
                            Photo
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center text-xs md:text-sm font-bold mb-8">
                      <div className="border-2 border-gray-800 p-2 md:p-3 bg-gray-100">
                        <div className="text-gray-600 text-[10px] md:text-xs uppercase mb-1">Total Days</div>
                        <div className="text-lg md:text-xl">{attStats.total}</div>
                      </div>
                      <div className="border-2 border-gray-800 p-2 md:p-3 bg-green-50">
                        <div className="text-green-700 text-[10px] md:text-xs uppercase mb-1">Present</div>
                        <div className="text-lg md:text-xl text-green-700">{attStats.present}</div>
                      </div>
                      <div className="border-2 border-gray-800 p-2 md:p-3 bg-red-50">
                        <div className="text-red-700 text-[10px] md:text-xs uppercase mb-1">Absent</div>
                        <div className="text-lg md:text-xl text-red-700">{attStats.absent}</div>
                      </div>
                      <div className="border-2 border-gray-800 p-2 md:p-3 bg-purple-50">
                        <div className="text-purple-700 text-[10px] md:text-xs uppercase mb-1">Holiday</div>
                        <div className="text-lg md:text-xl text-purple-700">{attStats.holiday || 0}</div>
                      </div>
                      <div className="border-2 border-gray-800 p-2 md:p-3 bg-blue-50">
                        <div className="text-blue-700 text-[10px] md:text-xs uppercase mb-1">Attend %</div>
                        <div className="text-lg md:text-xl text-blue-700">
                          {attStats.total > 0 ? Math.round((attStats.present / (attStats.total - (attStats.holiday || 0))) * 100) || 0 : 0}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 mb-4 p-4 text-center border-t border-black">
                      <p className="font-bold text-gray-800 text-sm tracking-wide uppercase">
                        For detailed information about student attendance records, please contact the Head Office of Koshi Competitive English School.
                      </p>
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}