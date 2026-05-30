import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export default function CampusGallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const q = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        setImages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Failed to load gallery:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, []);

  return (
    <section className="py-16 bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#003b8b] mb-2">Campus Gallery</h2>
          <p className="text-gray-500 font-medium">A glimpse into our vibrant school life</p>
        </div>

        {/* Dynamic Image Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-pulse text-[#003b8b] font-bold">Loading Gallery...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {images.length > 0 ? (
              images.map((img) => (
                <div 
                  key={img.id} 
                  className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 bg-white"
                >
                  {/* Aspect ratio container to ensure uniform boxes */}
                  <div className="aspect-[4/3] w-full">
                    <img 
                      src={img.url} 
                      alt="School Activity" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 italic py-10">
                Gallery is currently being updated. Check back soon!
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}