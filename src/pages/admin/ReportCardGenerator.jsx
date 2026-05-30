import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function ReportCardGenerator() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({}); 
  
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [examTerm, setExamTerm] = useState(""); 
  
  const [viewType, setViewType] = useState(null); 
  const [activeData, setActiveData] = useState(null); 
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const snap = await getDocs(collection(db, "classes"));
      setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchStudentsAndResults = async () => {
      if (!selectedClassId || !selectedSection || !examTerm) {
        setStudents([]);
        setResults({});
        return;
      }
      
      setLoading(true);
      const qStudents = query(collection(db, "students"), where("classId", "==", selectedClassId), where("section", "==", selectedSection));
      const snapStudents = await getDocs(qStudents);
      const studentData = snapStudents.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      studentData.sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
      setStudents(studentData);

      const qResults = query(collection(db, "exam_results"), where("classId", "==", selectedClassId), where("section", "==", selectedSection), where("examName", "==", examTerm));
      const snapResults = await getDocs(qResults);
      const resultMap = {};
      snapResults.forEach(doc => { resultMap[doc.data().studentId] = doc.data(); });
      setResults(resultMap);
      setLoading(false);
    };
    fetchStudentsAndResults();
  }, [selectedClassId, selectedSection, examTerm]);

  const formatDOB = (dob) => {
    if (!dob) return "";
    const parts = dob.split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dob;
  };

  const openSingleDocument = (student) => {
    setActiveData({ student, result: results[student.id] });
    setViewType("single");
  };

  const openBatchDocument = () => {
    const gradedStudents = students.filter(s => results[s.id]);
    if (gradedStudents.length === 0) {
      return alert("No marks have been entered for this class yet!");
    }
    setViewType("batch");
  };

  const handlePrint = () => {
    window.print();
  };

  const activeClass = classes.find(c => c.id === selectedClassId);
  const chartColors = ["#1e3a8a", "#b91c1c", "#0f766e", "#a16207", "#4338ca", "#be123c"];

  const gradedStudentsForBatch = viewType === 'batch' ? students.filter(s => results[s.id]) : [];
  const renderList = viewType === 'single' && activeData ? [activeData] : gradedStudentsForBatch.map(s => ({ student: s, result: results[s.id] }));

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

      <div className={viewType ? "no-print" : "block"}>
        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Batch Report Card Generator</h1>

        {/* FILTERS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Exam Term</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
            <select className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold"
              value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}>
              <option value="">-- Choose --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Section</label>
            <select className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold"
              value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} disabled={!selectedClassId}>
              <option value="">-- Choose --</option>
              {activeClass?.sections?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {selectedClassId && selectedSection && examTerm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-slate-800 flex justify-between items-center text-white">
              <h3 className="font-bold">Student Roster</h3>
              <button 
                onClick={openBatchDocument}
                className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded font-bold shadow transition"
              >
                Generate ALL Report Cards
              </button>
            </div>
            
            {loading ? (
              <div className="p-8 text-center font-bold text-blue-600 animate-pulse">Loading data...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-600 text-sm">
                  <tr>
                    <th className="p-4 border-b">Roll No</th>
                    <th className="p-4 border-b">Student Name</th>
                    <th className="p-4 border-b text-center">Result Status</th>
                    <th className="p-4 border-b text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr><td colSpan="4" className="p-6 text-center text-gray-500 font-bold">No students found.</td></tr>
                  ) : (
                    students.map(student => {
                      const hasResult = results[student.id];
                      return (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-bold text-gray-700">{student.rollNo}</td>
                          <td className="p-4 font-bold uppercase">{student.studentName}</td>
                          <td className="p-4 text-center">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${hasResult ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {hasResult ? "Marks Entered" : "Pending"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => openSingleDocument(student)} 
                              disabled={!hasResult} 
                              className={`px-4 py-2 font-bold border rounded outline-none ${hasResult ? 'bg-[#003b8b] text-white hover:bg-blue-900 border-blue-900' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                            >
                              View Report Card
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* PRINT PREVIEW OVERLAY */}
      {viewType && (
        <div className="absolute inset-0 bg-white z-50 print-area pb-20">
          
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white no-print sticky top-0 z-10 shadow-md">
            <h3 className="font-bold">
              {viewType === "batch" ? `Batch Print Preview (${gradedStudentsForBatch.length} Cards)` : "Report Card Preview"}
            </h3>
            <div className="flex gap-4">
              <button onClick={handlePrint} className="bg-blue-600 px-6 py-2 rounded font-bold hover:bg-blue-500 flex items-center gap-2 shadow-sm">
                <span>🖨️</span> Print PDF
              </button>
              <button onClick={() => setViewType(null)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold outline-none">
                Close
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            {renderList.map((data, idx) => (
              <div key={data.student.id} className={`bg-white pt-8 max-w-4xl mx-auto w-full ${idx !== renderList.length - 1 ? 'page-break' : ''}`}>
                
                <div className="border border-gray-800 p-1 font-sans text-black">
                  <div className="border border-gray-800 p-4 relative">
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-24 h-24 flex items-center justify-center border-2 border-gray-300 rounded overflow-hidden p-1 flex-shrink-0">
                        <img src="/logo.jpg" alt="School Logo" className="w-full h-full object-contain" />
                      </div>
                      
                      <div className="flex-1 text-center px-2">
                        <h1 className="text-3xl font-bold tracking-widest text-blue-900 mb-1" style={{fontFamily: "Times New Roman, serif", color: "#1e3a8a"}}>
                          KOSHI COMPETITIVE ENGLISH SCHOOL
                        </h1>
                        <p className="text-xs font-bold mb-2">Near Durga Mandir, Rambagh (Purnea) | Mob: 9122310366</p>
                        <div className="inline-block border-2 border-black px-4 py-1 font-bold text-base tracking-widest uppercase bg-gray-100" style={{ backgroundColor: "#f3f4f6" }}>
                          REPORT CARD
                        </div>
                        <p className="text-xs font-bold mt-2 uppercase text-blue-900 tracking-wide">ACADEMIC SESSION : {examTerm}</p>
                      </div>

                      <div className="w-24 h-24 flex-shrink-0"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-xs font-bold border-t-2 border-b-2 border-black py-2 mb-3">
                      <div>Name of Student: <span className="uppercase ml-2 text-blue-900" style={{ color: "#1e3a8a" }}>{data.student.studentName}</span></div>
                      <div>Roll No: <span className="uppercase ml-2">{data.student.rollNo}</span></div>
                      
                      <div>Father's Name: <span className="uppercase ml-2">{data.student.fatherName}</span></div>
                      <div>D.O.B: <span className="uppercase ml-2">{formatDOB(data.student.dob)}</span></div>
                      
                      <div>Mother's Name: <span className="uppercase ml-2">{data.student.motherName}</span></div>
                      <div>Grade & Section: <span className="uppercase ml-2">{activeClass?.name} - {data.student.section}</span></div>
                    </div>

                    <table className="w-full border-collapse border border-black mb-3 text-xs text-center font-bold">
                      <thead>
                        <tr className="bg-gray-100" style={{ backgroundColor: "#f3f4f6" }}>
                          <th className="border border-black p-1 text-left w-1/3">SUBJECTS</th>
                          <th className="border border-black p-1">Full Marks</th>
                          <th className="border border-black p-1">Passing Marks</th>
                          <th className="border border-black p-1">Marks Obtained</th>
                          <th className="border border-black p-1">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.result.subjects.map((sub, index) => (
                          <tr key={index}>
                            <td className="border border-black p-1 text-left uppercase">{sub.name}</td>
                            <td className="border border-black p-1">{sub.fullMarks}</td>
                            <td className="border border-black p-1 text-gray-500">{Math.ceil(sub.fullMarks * 0.33)}</td>
                            <td className="border border-black p-1">{sub.marksObtained}</td>
                            <td className="border border-black p-1 text-red-700" style={{ color: "#b91c1c" }}>{sub.grade}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 border-t-2 border-black" style={{ backgroundColor: "#f3f4f6" }}>
                          <td className="border border-black p-1 text-left text-sm">TOTAL</td>
                          <td className="border border-black p-1 text-sm">{data.result.totalFullMarks}</td>
                          <td className="border border-black p-1 text-sm text-gray-500">-</td>
                          <td className="border border-black p-1 text-sm">{data.result.totalObtained}</td>
                          <td className="border border-black p-1 text-sm text-red-700" style={{ color: "#b91c1c" }}>{data.result.overallGrade}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="mb-4">
                      <div className="font-bold text-[10px] bg-gray-200 border border-black p-1 text-center mb-1" style={{ backgroundColor: "#e5e7eb" }}>
                        Grade Scale for Scholastic Areas
                      </div>
                      <table className="w-full border-collapse border border-black text-[10px] text-center font-bold">
                        <tbody>
                          <tr className="bg-gray-50" style={{ backgroundColor: "#f9fafb" }}>
                            <td className="border border-black p-1 w-20">Grade</td>
                            <td className="border border-black p-1 text-green-700">A1</td>
                            <td className="border border-black p-1 text-green-600">A2</td>
                            <td className="border border-black p-1 text-blue-700">B1</td>
                            <td className="border border-black p-1 text-blue-600">B2</td>
                            <td className="border border-black p-1">C1</td>
                            <td className="border border-black p-1">C2</td>
                            <td className="border border-black p-1 text-orange-600">D</td>
                            <td className="border border-black p-1 text-red-600">E</td>
                          </tr>
                          <tr>
                            <td className="border border-black p-1">Marks Range</td>
                            <td className="border border-black p-1">91-100</td>
                            <td className="border border-black p-1">81-90</td>
                            <td className="border border-black p-1">71-80</td>
                            <td className="border border-black p-1">61-70</td>
                            <td className="border border-black p-1">51-60</td>
                            <td className="border border-black p-1">41-50</td>
                            <td className="border border-black p-1">33-40</td>
                            <td className="border border-black p-1 text-red-600 text-[8px]" style={{ color: "#dc2626" }}>Needs Improvement</td>
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
                        <div className="absolute inset-0 z-10 flex items-end justify-around px-4 pb-[1px]">
                          {data.result.subjects.map((sub, idx) => {
                            const percentage = Math.min((sub.marksObtained / sub.fullMarks) * 100, 100);
                            return (
                              <div key={idx} className="flex flex-col items-center justify-end h-full w-10">
                                <div 
                                  className="w-8 border border-black relative"
                                  style={{ 
                                    height: `${percentage}%`,
                                    backgroundColor: chartColors[idx % chartColors.length],
                                    boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.8)"
                                  }}
                                >
                                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-black bg-white/90 px-1 rounded">
                                    {sub.marksObtained}
                                  </span>
                                </div>
                                <div className="absolute -bottom-6 text-[9px] font-bold mt-1 uppercase text-center w-14 leading-tight break-words">
                                  {sub.name}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-bold border-2 border-black p-3 mt-8">
                      <div>
                        <div className="mb-2">Attendance: <span className="border-b border-black ml-2 px-8 inline-block"></span></div>
                        
                        {/* RESULT LINE CHANGED TO A BLANK UNDERLINE */}
                        <div>Result: <span className="border-b border-black ml-2 px-16 inline-block"></span></div>
                      </div>
                      
                      <div className="flex justify-between items-end pl-8">
                        <div className="text-center pt-4 border-t border-black w-24">Class Teacher</div>
                        <div className="text-center pt-4 border-t border-black w-24">Principal</div>
                      </div>
                    </div>

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