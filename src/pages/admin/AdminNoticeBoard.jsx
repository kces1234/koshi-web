import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminNoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchNotices = async () => {
    try {
      const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setNotices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching notices:", error);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "notices", editingId), {
          title,
          content,
          isActive,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "notices"), {
          title,
          content,
          isActive,
          date: new Date().toLocaleDateString('en-GB'),
          createdAt: serverTimestamp()
        });
      }
      setTitle("");
      setContent("");
      setIsActive(true);
      setEditingId(null);
      fetchNotices();
    } catch (error) {
      console.error("Error saving notice:", error);
    }
    setLoading(false);
  };

  const handleEdit = (notice) => {
    setEditingId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setIsActive(notice.isActive);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    try {
      await deleteDoc(doc(db, "notices", id));
      fetchNotices();
    } catch (error) {
      console.error("Error deleting notice:", error);
    }
  };

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Manage Notice Board</h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 max-w-3xl">
        <h2 className="text-xl font-bold text-[#003b8b] mb-4">{editingId ? "Edit Notice" : "Add New Notice"}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Notice Title</label>
            <input 
              type="text" required 
              className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-bold"
              placeholder="e.g. Admission Open 2026-27"
              value={title} onChange={(e) => setTitle(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Notice Content</label>
            <textarea 
              required rows="3"
              className="w-full border-2 border-gray-200 p-3 rounded-lg outline-none focus:border-[#003b8b] font-medium resize-none"
              placeholder="Enter the full details of the notice..."
              value={content} onChange={(e) => setContent(e.target.value)} 
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" id="isActive"
              className="w-5 h-5 cursor-pointer"
              checked={isActive} onChange={(e) => setIsActive(e.target.checked)} 
            />
            <label htmlFor="isActive" className="font-bold text-gray-700 cursor-pointer">Show on Public Homepage</label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={loading} className="bg-[#003b8b] text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-900 transition outline-none">
            {loading ? "Saving..." : editingId ? "Update Notice" : "Publish Notice"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setTitle(""); setContent(""); setIsActive(true); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition outline-none">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* NOTICE LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white text-sm">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Title & Content</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notices.length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-gray-500 font-bold">No notices found.</td></tr>
            ) : (
              notices.map(notice => (
                <tr key={notice.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-600 whitespace-nowrap">{notice.date}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800 text-base">{notice.title}</div>
                    <div className="text-gray-500 text-sm mt-1 line-clamp-2">{notice.content}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${notice.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {notice.isActive ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={() => handleEdit(notice)} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-bold hover:bg-yellow-200 mr-2 outline-none">Edit</button>
                    <button onClick={() => handleDelete(notice.id)} className="bg-red-100 text-red-800 px-3 py-1 rounded font-bold hover:bg-red-200 outline-none">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}