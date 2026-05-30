import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function StudentManagement() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Filter & Form State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [formData, setFormData] = useState({
    studentName: "", rollNo: "", dob: "", fatherName: "", motherName: "", mobile: "", address: "", hostelOrHome: "Home", profileImage: ""
  });

  // Cloudinary & Preview State
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [localPreview, setLocalPreview] = useState(""); // For Add Form
  const [editLocalPreview, setEditLocalPreview] = useState(""); // For Edit Modal
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Action State (Edit & Delete)
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // 1. Fetch Classes for dropdown
  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, "classes"));
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, []);

  // 2. Fetch Students
  const fetchStudents = async () => {
    if (!selectedClassId || !selectedSection) {
      setStudents([]);
      return;
    }
    const q = query(
      collection(db, "students"),
      where("classId", "==", selectedClassId),
      where("section", "==", selectedSection)
    );
    const snapshot = await getDocs(q);
    setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId, selectedSection]);

  // 3. Handle Image Upload & Instant Preview
  const handleImageUpload = async (e, isEditMode = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageError("");
    
    // Strict Size Validation: 10KB to 60KB
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB < 10 || fileSizeKB > 60) {
      setImageError(`Invalid size (${Math.round(fileSizeKB)}KB). Image must be between 10KB and 60KB.`);
      e.target.value = null;
      return;
    }

    // Create an instant local preview
    const objectUrl = URL.createObjectURL(file);
    if (isEditMode) {
      setEditLocalPreview(objectUrl);
    } else {
      setLocalPreview(objectUrl);
    }

    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: data,
      });
      const cloudData = await res.json();
      
      if (cloudData.secure_url) {
        if (isEditMode) {
          setEditFormData({ ...editFormData, profileImage: cloudData.secure_url });
        } else {
          setFormData({ ...formData, profileImage: cloudData.secure_url });
        }
      }
    } catch (err) {
      console.error(err);
      setImageError("Failed to upload image to cloud server.");
      // Clear preview if upload fails
      if (isEditMode) setEditLocalPreview("");
      else setLocalPreview("");
    } finally {
      setUploading(false);
    }
  };

  // 4. Handle Admission Submit (Create)
  const handleAdmitStudent = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "students"), {
        ...formData,
        classId: selectedClassId,
        section: selectedSection,
        createdAt: new Date()
      });
      // Reset form & previews
      setFormData({ 
        studentName: "", rollNo: "", dob: "", fatherName: "", motherName: "", mobile: "", address: "", hostelOrHome: "Home", profileImage: "" 
      });
      setLocalPreview("");
      setImageError("");
      fetchStudents(); 
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  // 5. Handle Edit Submission (Update)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const studentRef = doc(db, "students", selectedStudent.id);
      await updateDoc(studentRef, editFormData);
      setIsEditModalOpen(false);
      setEditLocalPreview("");
      fetchStudents(); 
    } catch (error) {
      console.error("Error updating student:", error);
    }
  };

  // 6. Handle Delete Submission (Delete)
  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, "students", selectedStudent.id));
      setIsDeleteModalOpen(false);
      fetchStudents(); 
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  // UI Helpers
  const openEditModal = (student) => {
    setSelectedStudent(student);
    setEditFormData(student); 
    setImageError("");
    setEditLocalPreview(""); // Clear old local preview
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const activeClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Student Management</h1>

      {/* --- FILTER SECTION --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-blue-600">1. Select Class & Section</h2>
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

      {/* --- ADMISSION FORM --- */}
      {selectedClassId && selectedSection && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8 border-l-4 border-l-green-500">
          <h2 className="text-xl font-semibold mb-4 text-green-600">2. Admit New Student</h2>
          
          <form onSubmit={handleAdmitStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* PHOTO UPLOAD SECTION WITH INSTANT PREVIEW */}
            <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 flex items-center gap-6 mb-2">
              <div className="w-20 h-24 border-2 border-gray-300 bg-white rounded flex items-center justify-center overflow-hidden">
                {(localPreview || formData.profileImage) ? (
                  <img 
                    src={localPreview || formData.profileImage} 
                    alt="Preview" 
                    className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-50' : 'opacity-100'}`} 
                  />
                ) : (
                  <span className="text-gray-400 text-[10px] font-bold text-center">No Photo</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">Student Passport Photo</label>
                <input 
                  type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} disabled={uploading}
                  className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#003b8b] file:text-white hover:file:bg-blue-900 cursor-pointer"
                />
                <p className="text-[11px] text-gray-500 mt-1">Requirement: Strict 10KB - 60KB limit.</p>
                {uploading && <p className="text-xs text-blue-600 font-bold mt-1">Uploading to Cloudinary...</p>}
                {imageError && <p className="text-xs text-red-600 font-bold mt-1">{imageError}</p>}
              </div>
            </div>

            <input required type="text" placeholder="Student Name" className="border p-2 rounded"
             value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} />
            <input required type="text" placeholder="Roll No" className="border p-2 rounded"
             value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} />
            <div className="flex flex-col">
               <span className="text-xs text-gray-500 mb-1 ml-1">Date of Birth</span>
               <input required type="date" className="border p-2 rounded text-gray-700"
                 value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <input required type="text" placeholder="Father's Name" className="border p-2 rounded"
             value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
            <input required type="text" placeholder="Mother's Name" className="border p-2 rounded"
             value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
            <input required type="tel" maxLength="10" minLength="10" pattern="[0-9]{10}" placeholder="10-Digit Mobile" className="border p-2 rounded"
             value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} />
            <input required type="text" placeholder="Full Home Address" className="border p-2 rounded md:col-span-2"
             value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            <select className="border p-2 rounded" 
             value={formData.hostelOrHome} onChange={e => setFormData({...formData, hostelOrHome: e.target.value})}>
               <option value="Home">Day Scholar (Home)</option>
               <option value="Hostel">Hostel Resident</option>
            </select>
            
            <button type="submit" disabled={uploading} className={`md:col-span-3 text-white p-3 rounded-lg transition font-bold text-lg mt-2 shadow-sm ${uploading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
               {uploading ? "Please wait..." : "+ Save Student Record"}
            </button>
          </form>
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b font-semibold text-gray-700 flex justify-between items-center">
          <span>Student Roster {selectedSection && `(${selectedSection})`}</span>
          <span className="text-sm font-normal bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Total: {students.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                <th className="p-4 border-b">Roll No</th>
                <th className="p-4 border-b">Student Details</th>
                <th className="p-4 border-b">Parents</th>
                <th className="p-4 border-b">Contact</th>
                <th className="p-4 border-b">Type</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500 italic">No students found. Select a class and section to view.</td></tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 border-b text-sm transition">
                    <td className="p-4 font-medium text-gray-900">{student.rollNo}</td>
                    <td className="p-4 flex items-center gap-3">
                      {/* Show tiny preview in table */}
                      <div className="w-10 h-10 rounded-full border border-gray-300 overflow-hidden bg-gray-100 flex-shrink-0">
                        {student.profileImage ? (
                           <img src={student.profileImage} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">N/A</div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-blue-700 uppercase">{student.studentName}</div>
                        <div className="text-xs text-gray-500">DOB: {student.dob}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="uppercase text-xs font-bold">F: {student.fatherName}</div>
                      <div className="uppercase text-xs font-bold text-gray-600">M: {student.motherName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{student.mobile}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]" title={student.address}>{student.address}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${student.hostelOrHome === 'Hostel' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {student.hostelOrHome}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEditModal(student)} className="text-blue-500 hover:text-blue-700 font-medium mr-4 px-2 py-1 rounded hover:bg-blue-50 transition">
                        Edit
                      </button>
                      <button onClick={() => openDeleteModal(student)} className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EDIT STUDENT MODAL --- */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Student: {selectedStudent.studentName}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white hover:text-gray-200 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              
              {/* EDIT PHOTO UPLOAD WITH INSTANT PREVIEW */}
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 flex items-center gap-6 mb-6">
                <div className="w-20 h-24 border-2 border-gray-300 bg-white rounded flex items-center justify-center overflow-hidden">
                  {(editLocalPreview || editFormData.profileImage) ? (
                    <img 
                      src={editLocalPreview || editFormData.profileImage} 
                      alt="Preview" 
                      className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-50' : 'opacity-100'}`} 
                    />
                  ) : (
                    <span className="text-gray-400 text-[10px] font-bold text-center">No Photo</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Update Student Photo</label>
                  <input 
                    type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={uploading}
                    className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#003b8b] file:text-white hover:file:bg-blue-900 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Requirement: Strict 10KB - 60KB limit.</p>
                  {uploading && <p className="text-xs text-blue-600 font-bold mt-1">Uploading to Cloudinary...</p>}
                  {imageError && <p className="text-xs text-red-600 font-bold mt-1">{imageError}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Student Name</label>
                  <input required type="text" className="w-full border p-2 rounded"
                    value={editFormData.studentName || ""} onChange={e => setEditFormData({...editFormData, studentName: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Roll No</label>
                  <input required type="text" className="w-full border p-2 rounded"
                    value={editFormData.rollNo || ""} onChange={e => setEditFormData({...editFormData, rollNo: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Father's Name</label>
                  <input required type="text" className="w-full border p-2 rounded"
                    value={editFormData.fatherName || ""} onChange={e => setEditFormData({...editFormData, fatherName: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Mother's Name</label>
                  <input required type="text" className="w-full border p-2 rounded"
                    value={editFormData.motherName || ""} onChange={e => setEditFormData({...editFormData, motherName: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Mobile Number</label>
                  <input required type="tel" maxLength="10" className="w-full border p-2 rounded"
                    value={editFormData.mobile || ""} onChange={e => setEditFormData({...editFormData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Date of Birth</label>
                  <input required type="date" className="w-full border p-2 rounded"
                    value={editFormData.dob || ""} onChange={e => setEditFormData({...editFormData, dob: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Home Address</label>
                  <input required type="text" className="w-full border p-2 rounded"
                    value={editFormData.address || ""} onChange={e => setEditFormData({...editFormData, address: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 mb-1 ml-1 block">Residential Status</label>
                  <select className="w-full border p-2 rounded" 
                    value={editFormData.hostelOrHome || "Home"} onChange={e => setEditFormData({...editFormData, hostelOrHome: e.target.value})}>
                    <option value="Home">Day Scholar (Home)</option>
                    <option value="Hostel">Hostel Resident</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 font-bold">Cancel</button>
                <button type="submit" disabled={uploading} className={`px-6 py-2 text-white rounded font-bold ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Delete Student?</h3>
              <p className="text-center text-gray-500 mb-6">
                Are you sure you want to permanently remove <strong>{selectedStudent.studentName}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 transition font-bold">Cancel</button>
                <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-bold">Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}