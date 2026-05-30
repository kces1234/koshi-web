import { useState, useEffect } from "react";
import { collection, getDocs, query, where, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db } from "../../firebase";

export default function FeeManagement() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Ledger State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLedger, setStudentLedger] = useState([]);
  
  // Filter State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState(null); 
  
  // Anti-Spam State to prevent duplicate clicking
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [feeData, setFeeData] = useState({
    monthsCovered: "", 
    admissionFee: "", developmentFee: "", schoolFee: "", hostelFee: "", 
    examinationFee: "", backDues: "", bookCharge: "", miscellaneousFee: "", 
    registrationFee: "", otherFee: "", paidAmount: "", paymentMethod: "Cash"
  });

  // 1. Fetch Classes for dropdowns
  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, "classes"));
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, []);

  // 2. Fetch Students when Class/Section changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId || !selectedSection) {
        setStudents([]);
        setSelectedStudent(null);
        return;
      }
      const q = query(
        collection(db, "students"),
        where("classId", "==", selectedClassId),
        where("section", "==", selectedSection)
      );
      const snapshot = await getDocs(q);
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSelectedStudent(null); // Reset when changing classes
    };
    fetchStudents();
  }, [selectedClassId, selectedSection]);

  // 3. Fetch specific Student's Ledger when clicked
  const fetchStudentLedger = async (student) => {
    setSelectedStudent(student);
    const qFees = query(
      collection(db, "fees"),
      where("studentId", "==", student.id)
    );
    const snapFees = await getDocs(qFees);
    const fetchedFees = snapFees.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort newest first
    fetchedFees.sort((a, b) => (b.datePaid?.toMillis() || 0) - (a.datePaid?.toMillis() || 0));
    setStudentLedger(fetchedFees);
  };

  // Math Helper
  const calculateTotalBilled = () => {
    return (Number(feeData.admissionFee) || 0) + (Number(feeData.developmentFee) || 0) +
           (Number(feeData.schoolFee) || 0) + (Number(feeData.hostelFee) || 0) +
           (Number(feeData.examinationFee) || 0) + (Number(feeData.backDues) || 0) +
           (Number(feeData.bookCharge) || 0) + (Number(feeData.miscellaneousFee) || 0) +
           (Number(feeData.registrationFee) || 0) + (Number(feeData.otherFee) || 0);
  }; 

  const handlePrint = () => {
    window.print();
  };

  const totalLedgerBilled = studentLedger.reduce((sum, fee) => sum + (fee.billedAmount || 0), 0);
  const totalLedgerPaid = studentLedger.reduce((sum, fee) => sum + (fee.paidAmount || 0), 0);
  const totalPending = totalLedgerBilled - totalLedgerPaid;
  const activeClass = classes.find(c => c.id === selectedClassId);

  // Auto-fill Modal Function
  const handleOpenTransactionModal = () => {
    setFeeData({
      monthsCovered: "", 
      admissionFee: "", developmentFee: "", schoolFee: "", hostelFee: "", 
      examinationFee: "", 
      backDues: totalPending > 0 ? totalPending.toString() : "", 
      bookCharge: "", miscellaneousFee: "", 
      registrationFee: "", otherFee: "", paidAmount: "", paymentMethod: "Cash"
    });
    setIsModalOpen(true);
  };

  // 4. Submit New Ledger Entry (With Systematic Receipt Numbers)
  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    
    // STOP DOUBLE CLICKS: If already submitting, do nothing!
    if (isSubmitting) return;
    setIsSubmitting(true);

    const totalBilled = calculateTotalBilled();
    const paid = Number(feeData.paidAmount) || 0;
    
    let calcStatus = "Unpaid";
    if (paid >= totalBilled) calcStatus = "Paid";
    else if (paid > 0 && paid < totalBilled) calcStatus = "Partial";

    try {
      // Setup transaction references
      const counterRef = doc(db, "settings", "receiptCounter");
      const newFeeRef = doc(collection(db, "fees")); 

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextReceiptNum = 1000; 
        if (counterDoc.exists() && counterDoc.data().lastNumber) {
          nextReceiptNum = counterDoc.data().lastNumber + 1;
        }

        const formattedReceiptId = `KCS-${nextReceiptNum}`;

        // Update Counter
        transaction.set(counterRef, { lastNumber: nextReceiptNum }, { merge: true });

        // Save Fee
        transaction.set(newFeeRef, {
          receiptId: formattedReceiptId, 
          studentId: selectedStudent.id,
          studentName: selectedStudent.studentName,
          rollNo: selectedStudent.rollNo,
          classId: selectedClassId,
          section: selectedSection,
          monthsCovered: feeData.monthsCovered || "N/A",
          billedAmount: totalBilled,
          paidAmount: paid,
          paymentMethod: feeData.paymentMethod,
          status: calcStatus,
          datePaid: serverTimestamp(),
          breakdown: {
            admissionFee: Number(feeData.admissionFee) || 0,
            developmentFee: Number(feeData.developmentFee) || 0,
            schoolFee: Number(feeData.schoolFee) || 0,
            hostelFee: Number(feeData.hostelFee) || 0,
            examinationFee: Number(feeData.examinationFee) || 0,
            backDues: Number(feeData.backDues) || 0,
            bookCharge: Number(feeData.bookCharge) || 0,
            miscellaneousFee: Number(feeData.miscellaneousFee) || 0,
            registrationFee: Number(feeData.registrationFee) || 0,
            otherFee: Number(feeData.otherFee) || 0,
          }
        });
      });
      
      setIsModalOpen(false);
      setFeeData({
        monthsCovered: "", admissionFee: "", developmentFee: "", schoolFee: "", hostelFee: "", 
        examinationFee: "", backDues: "", bookCharge: "", miscellaneousFee: "", registrationFee: "", 
        otherFee: "", paidAmount: "", paymentMethod: "Cash"
      });
      fetchStudentLedger(selectedStudent);
    } catch (error) {
      console.error("Error saving fee:", error);
      alert("Failed to save fee record.");
    } finally {
      // ALWAYS unlock the button when finished
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Inline Print Styles */}
      <style type="text/css" media="print">
        {`
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
          @page { size: auto;  margin: 0mm; }
        `}
      </style>

      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Digital Fee Ledger</h1>

      {/* --- FILTER SECTION --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
        <div className="flex gap-4">
          <select 
            className="border p-2 rounded w-64 focus:ring-2 focus:ring-blue-400 outline-none"
            value={selectedClassId} 
            onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSection(""); }}
          >
            <option value="">-- Choose Class --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          <select 
            className="border p-2 rounded w-64 focus:ring-2 focus:ring-blue-400 outline-none"
            value={selectedSection} 
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClassId}
          >
            <option value="">-- Choose Section --</option>
            {activeClass?.sections?.map((sec, idx) => (
              <option key={idx} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- TWO COLUMN LAYOUT --- */}
      {selectedClassId && selectedSection && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Student List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-fit lg:col-span-1">
            <div className="p-4 bg-slate-800 border-b font-semibold text-white">Class Roster</div>
            <table className="w-full text-left border-collapse">
              <tbody>
                {students.length === 0 ? (
                  <tr><td className="p-4 text-center text-gray-500">No students found.</td></tr>
                ) : (
                  students.map(student => (
                    <tr 
                      key={student.id} 
                      onClick={() => fetchStudentLedger(student)}
                      className={`border-b cursor-pointer transition ${selectedStudent?.id === student.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{student.studentName}</div>
                        <div className="text-xs text-gray-500">Roll No: {student.rollNo}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* RIGHT: The Digital Ledger */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden h-fit lg:col-span-2">
            {!selectedStudent ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-lg font-medium">Select a student to view their ledger.</p>
              </div>
            ) : (
              <div>
                <div className="p-6 bg-blue-50 border-b flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900">{selectedStudent.studentName}'s Ledger</h2>
                    <p className="text-blue-700 text-sm">{activeClass?.name} - {selectedSection}</p>
                  </div>
                  <button onClick={handleOpenTransactionModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition">
                    + Log Transaction
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 p-6 bg-white border-b">
                  <div className="p-4 rounded-lg bg-gray-50 border">
                    <div className="text-sm text-gray-500 font-medium mb-1">Total Billed</div>
                    <div className="text-2xl font-bold text-gray-800">₹{totalLedgerBilled}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                    <div className="text-sm text-green-600 font-medium mb-1">Total Paid</div>
                    <div className="text-2xl font-bold text-green-700">₹{totalLedgerPaid}</div>
                  </div>
                  <div className={`p-4 rounded-lg border ${totalPending > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50'}`}>
                    <div className={`text-sm font-medium mb-1 ${totalPending > 0 ? 'text-red-600' : 'text-gray-500'}`}>Current Pending</div>
                    <div className={`text-2xl font-bold ${totalPending > 0 ? 'text-red-700' : 'text-gray-800'}`}>₹{totalPending}</div>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <th className="p-4 border-b">Receipt Details</th>
                        <th className="p-4 border-b text-right">Billed</th>
                        <th className="p-4 border-b text-right">Paid</th>
                        <th className="p-4 border-b text-center">Status</th>
                        <th className="p-4 border-b text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentLedger.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 italic">No transactions recorded.</td></tr>
                      ) : (
                        studentLedger.map(fee => (
                          <tr key={fee.id} className="hover:bg-gray-50 border-b">
                            <td className="p-4">
                              <div className="font-bold text-blue-900 mb-1">{fee.receiptId || fee.id.substring(0,6).toUpperCase()}</div>
                              <div className="font-semibold text-gray-800 text-sm">Months: {fee.monthsCovered || "N/A"}</div>
                              <div className="text-xs text-gray-400 mt-1">Via {fee.paymentMethod} • {fee.datePaid?.toDate().toLocaleDateString('en-GB')}</div>
                            </td>
                            <td className="p-4 text-right font-medium text-gray-600">₹{fee.billedAmount}</td>
                            <td className="p-4 text-right font-bold text-green-600">₹{fee.paidAmount}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${fee.status === 'Paid' ? 'bg-green-100 text-green-700' : fee.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {fee.status}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => setViewReceipt(fee)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded bg-blue-50"
                              >
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- RECEIPT BREAKDOWN & PRINT MODAL --- */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-800 p-3 text-white flex justify-between items-center print:hidden">
              <h3 className="font-bold">Transaction Breakdown</h3>
              <div className="flex gap-4">
                <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 px-4 py-1 rounded font-medium shadow flex items-center gap-2">
                  🖨️ Print Receipt
                </button>
                <button onClick={() => setViewReceipt(null)} className="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
              </div>
            </div>

            {/* THE PRINTABLE RECEIPT */}
            <div id="printable-receipt" className="p-8 bg-white text-black overflow-y-auto w-full mx-auto" style={{fontFamily: "Arial, sans-serif"}}>
              
              <div className="flex items-center border-b-2 border-gray-800 pb-4 mb-4">
                <div className="w-20 h-24 mr-4 flex-shrink-0 flex items-center justify-center border border-gray-300">
                  <img src="/logo.jpg" alt="School Logo" className="max-w-full max-h-full object-contain" />
                </div>
                
                <div className="flex-1 text-center">
                  <h1 className="text-2xl font-bold tracking-wider mb-1" style={{color: "#8B0000"}}>KOSHI COMPETITIVE ENGLISH SCHOOL</h1>
                  <p className="text-sm font-medium">Near Durga Mandir, Rambagh (Purnea)</p>
                  <p className="text-sm font-medium">Mob.-9122310366, 6207096987</p>
                </div>
              </div>

              <div className="flex justify-between text-sm mb-4">
                <div>Receipt No: <span className="font-bold ml-1">{viewReceipt.receiptId || viewReceipt.id.substring(0,6).toUpperCase()}</span></div>
                <div>Date: <span className="font-bold ml-1">{viewReceipt.datePaid?.toDate().toLocaleDateString('en-GB')}</span></div>
              </div>

              <div className="text-sm mb-4 leading-relaxed">
                <div className="mb-2">Student's Name: <span className="font-bold text-lg mr-4 ml-1">{viewReceipt.studentName}</span> 
                Months: <span className="font-bold text-lg ml-1">{viewReceipt.monthsCovered || "N/A"}</span></div>
                <div>Class: <span className="font-bold text-lg mr-4 ml-1">{activeClass?.name}</span> 
                Sec: <span className="font-bold text-lg mr-4 ml-1">{viewReceipt.section}</span> 
                Roll No: <span className="font-bold text-lg ml-1">{viewReceipt.rollNo}</span></div>
              </div>

              <table className="w-full border-collapse border border-gray-800 text-sm mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-800 p-2 text-left">Particulars</th>
                    <th className="border border-gray-800 p-2 text-right w-32">Amount (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(viewReceipt.breakdown || { "Previous Fee Record": viewReceipt.billedAmount }).map(([key, amount]) => {
                    if (amount > 0) {
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <tr key={key}>
                          <td className="border-l border-r border-gray-800 p-2 border-b-0 border-t-0">{label}</td>
                          <td className="border-l border-r border-gray-800 p-2 text-right border-b-0 border-t-0 font-medium">{amount}</td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                  <tr><td className="border-l border-r border-gray-800 p-4"></td><td className="border-l border-r border-gray-800 p-4"></td></tr>
                  <tr><td className="border-l border-r border-gray-800 p-4"></td><td className="border-l border-r border-gray-800 p-4"></td></tr>
                  
                  <tr className="border-t border-gray-800 bg-gray-50 font-bold">
                    <td className="border border-gray-800 p-2 text-right">Total Billed:</td>
                    <td className="border border-gray-800 p-2 text-right">{viewReceipt.billedAmount}</td>
                  </tr>
                  <tr className="bg-gray-50 font-bold text-green-700">
                    <td className="border border-gray-800 p-2 text-right">Paid Amount:</td>
                    <td className="border border-gray-800 p-2 text-right">{viewReceipt.paidAmount}</td>
                  </tr>
                  <tr className="bg-gray-50 font-bold text-red-600">
                    <td className="border border-gray-800 p-2 text-right">Current Dues:</td>
                    <td className="border border-gray-800 p-2 text-right">{Math.max(0, viewReceipt.billedAmount - viewReceipt.paidAmount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mt-12 text-sm font-medium">
                <div className="text-center">
                  <div className="border-b border-gray-800 w-40 mb-1"></div>
                  Signature / Stamp
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- ADD TRANSACTION MODAL --- */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">New Itemized Receipt: {selectedStudent.studentName}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleFeeSubmit} className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="mb-6 pb-4 border-b">
                <label className="block text-sm font-bold text-gray-700 mb-1">Months Covered</label>
                <select 
                  required 
                  className="w-full border-2 border-gray-200 p-2 rounded outline-none focus:border-blue-500 transition bg-white"
                  value={feeData.monthsCovered} 
                  onChange={e => setFeeData({...feeData, monthsCovered: e.target.value})}
                >
                  <option value="">-- Select Month --</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                  <option value="All Dues Cleared">All Dues Cleared</option>
                </select>
              </div>

              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Particulars</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Admission Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.admissionFee} onChange={e => setFeeData({...feeData, admissionFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Development Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.developmentFee} onChange={e => setFeeData({...feeData, developmentFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">School Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.schoolFee} onChange={e => setFeeData({...feeData, schoolFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Hostel Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    disabled={selectedStudent.hostelOrHome === "Home"}
                    value={feeData.hostelFee} onChange={e => setFeeData({...feeData, hostelFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Examination Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.examinationFee} onChange={e => setFeeData({...feeData, examinationFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Back Dues</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.backDues} onChange={e => setFeeData({...feeData, backDues: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Book Charge</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.bookCharge} onChange={e => setFeeData({...feeData, bookCharge: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Miscellaneous Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.miscellaneousFee} onChange={e => setFeeData({...feeData, miscellaneousFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Registration Fee</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.registrationFee} onChange={e => setFeeData({...feeData, registrationFee: e.target.value})} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                  <span className="text-sm text-gray-700">Other</span>
                  <input type="number" min="0" placeholder="0" className="w-24 text-right border rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                    value={feeData.otherFee} onChange={e => setFeeData({...feeData, otherFee: e.target.value})} />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-200">
                  <span className="font-bold text-blue-900 text-lg">Calculated Total Billed:</span>
                  <span className="font-bold text-blue-900 text-2xl">₹{calculateTotalBilled()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-green-700 mb-1">Amount Paid Now (₹)</label>
                    <input required type="number" min="0" className="w-full border-2 border-green-300 p-2 rounded outline-none focus:border-green-500 font-bold text-green-800"
                      value={feeData.paidAmount} onChange={e => setFeeData({...feeData, paidAmount: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Payment Method</label>
                    <select className="w-full border-2 border-gray-200 p-2 rounded outline-none focus:border-blue-500"
                      value={feeData.paymentMethod} onChange={e => setFeeData({...feeData, paymentMethod: e.target.value})}>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-medium transition">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded font-bold text-white tracking-wide transition shadow-md ${
                    isSubmitting ? 'bg-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {isSubmitting ? "Saving..." : "Save to Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}