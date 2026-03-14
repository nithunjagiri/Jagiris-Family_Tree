import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, User, Mail, Phone, MapPin, Briefcase, Calendar } from 'lucide-react';
import { familyMembersApi } from '../services/api';

function Field({ icon: Icon, label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    familyMembersApi
      .get(id)
      .then((r) => setMember(r.data))
      .catch(() => setError('Member not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">{error || 'Member not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/family-members')}
          className="mt-4 text-primary-600 hover:underline dark:text-primary-400"
        >
          Back to Family Members
        </button>
      </div>
    );
  }

  const fullName = [member.name, member.surname].filter(Boolean).join(' ') || member.name;

  return (
    <div className="w-full max-w-none">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Link
          to={`/family-members/edit/${id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Pencil className="h-4 w-4" />
          Edit Member
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700">
              {member.profile_photo ? (
                <img src={member.profile_photo} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <User className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{fullName}</h1>
              {member.relation && (
                <p className="text-primary-600 dark:text-primary-400">{member.relation}</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field icon={User} label="Gender" value={member.gender} />
            <Field icon={Calendar} label="Date of birth" value={member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : null} />
            <Field icon={Calendar} label="Date of death" value={member.date_of_death ? new Date(member.date_of_death).toLocaleDateString() : null} />
            <Field icon={Phone} label="Phone" value={member.phone} />
            <Field icon={Mail} label="Email" value={member.email} />
            <Field icon={MapPin} label="Birth place" value={member.birth_place} />
            <Field icon={Briefcase} label="Occupation" value={member.occupation} />
          </div>
          {member.notes && (
            <div className="mt-6">
              <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Notes</p>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{member.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
