import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import AnnotationCard from '../components/AnnotationCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    api.userAnnotations(id).then((data) => setAnnotations(data.annotations || [])).finally(() => setLoading(false));
  }, [id]);

  async function follow() {
    const result = await api.followUser(id);
    setFollowing(result.following);
  }

  async function removePost(annotationId) {
    try {
      await api.removeAnnotation(annotationId);
      setAnnotations((items) => items.filter((item) => item.id !== annotationId));
    } catch (err) {
      console.error('Remove failed:', err);
      alert(err.message || 'Failed to remove post. Please try again.');
    }
  }

  if (loading) return <LoadingState label="Loading profile..." />;
  const user = annotations[0]?.author || { displayName: 'Annotated User', username: id };
  const isOwnProfile = currentUser?.uid === id;

  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div className="glass mb-8 rounded-[2rem] p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold text-3xl font-black text-black">{(user.displayName || 'A').slice(0, 1)}</div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">{user.displayName || 'Annotated User'}</h1>
              <p className="font-mono text-white/40">@{user.username || id}</p>
            </div>
          </div>
          <button onClick={follow} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-black"><UserPlus size={18} /> {following ? 'Following' : 'Follow'}</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {annotations.map((annotation) => <AnnotationCard key={annotation.id} annotation={annotation} onRemove={isOwnProfile ? removePost : undefined} />)}
      </div>
      {!annotations.length && <div className="glass rounded-3xl p-10 text-center text-white/45">No public annotations yet.</div>}
    </section>
  );
}
