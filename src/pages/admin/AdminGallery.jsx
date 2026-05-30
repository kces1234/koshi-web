import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // --- CLOUDINARY CONFIG ---
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;; 
  const uploadPreset = "koshi_gallery"; 

  // Fetch existing images from Firebase
  const fetchImages = async () => {
    try {
      const q = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setImages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Handle Image Upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    // 1. Prepare data for Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      // 2. Upload directly to Cloudinary
      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const cloudData = await cloudinaryRes.json();

      if (cloudData.secure_url) {
        // 3. Save the secure URL to Firebase Firestore
        await addDoc(collection(db, "gallery"), {
          url: cloudData.secure_url,
          timestamp: serverTimestamp()
        });
        
        // Refresh the gallery
        fetchImages();
      }
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
      e.target.value = null; // Clear the file input
    }
  };

  // Remove from Website (Firebase)
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this image from the website?")) return;
    
    try {
      await deleteDoc(doc(db, "gallery", id));
      setImages(images.filter(img => img.id !== id));
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image.");
    }
  };

  return (
    <div className="pb-10 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Manage Campus Gallery</h1>

      {/* Upload Control */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#003b8b] mb-1">Upload New Photo</h2>
          <p className="text-sm text-gray-500">Supported formats: JPG, PNG, WEBP. High-quality images are automatically compressed.</p>
        </div>
        
        <label className={`cursor-pointer px-6 py-3 rounded-xl font-bold text-white shadow-md transition ${uploading ? 'bg-gray-400' : 'bg-[#003b8b] hover:bg-blue-900'}`}>
          {uploading ? "Uploading to Cloud..." : "+ Select & Upload Image"}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {/* Admin Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((img) => (
          <div key={img.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
            <div className="h-48 w-full bg-gray-100 relative">
              <img src={img.url} alt="Campus" className="w-full h-full object-cover" />
              {/* Hover Delete Button */}
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(img.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-500">
                  Remove Image
                </button>
              </div>
            </div>
          </div>
        ))}
        {images.length === 0 && !uploading && (
          <div className="col-span-full text-center p-10 text-gray-400 font-bold border-2 border-dashed rounded-xl">
            No images in the gallery yet. Upload one above!
          </div>
        )}
      </div>
    </div>
  );
}