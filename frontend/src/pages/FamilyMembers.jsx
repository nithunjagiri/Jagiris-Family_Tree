import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Pencil, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { familyMembersApi } from '../services/api';
import { cn } from '../lib/utils';

export default function FamilyMembers() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = () =>
    familyMembersApi
      .list()
      .then((r) => setMembers(r.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, member) => {
    const name = [member.name, member.surname].filter(Boolean).join(' ') || member.name;
    if (!window.confirm(`Delete ${name}?`)) return;
    setDeletingId(id);
    try {
      await familyMembersApi.delete(id);
      setMembers((m) => m.filter((x) => x.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Family Members</h1>
        <Link
          to="/family-members/add"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
        >
          <UserPlus className="h-5 w-5" />
          Add Member
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                {m.profile_photo ? (
                  <img
                    src={m.profile_photo}
                    alt={m.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <User className="h-12 w-12" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{[m.name, m.surname].filter(Boolean).join(' ')}</h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">{m.relation}</p>
              {m.date_of_birth && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  DOB: {new Date(m.date_of_birth).toLocaleDateString()}
                </p>
              )}
              {m.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-300">{m.phone}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/family-members/edit/${m.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id, m)}
                    disabled={deletingId === m.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === m.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No family members yet. Add one to get started.
        </p>
      )}
    </div>
  );
}
