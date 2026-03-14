import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { familyMembersApi } from '../services/api';
import { cn } from '../lib/utils';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

const emptyOption = { value: '', label: '— None —' };

export default function AddMemberForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const state = location.state || {};
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [relation, setRelation] = useState('');
  const [gender, setGender] = useState('');
  const [date_of_birth, setDateOfBirth] = useState('');
  const [date_of_death, setDateOfDeath] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birth_place, setBirthPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [notes, setNotes] = useState('');
  const [father_id, setFatherId] = useState('');
  const [mother_id, setMotherId] = useState('');
  const [spouse_id, setSpouseId] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    familyMembersApi.list().then((r) => setMembers(r.data || []));
  }, []);

  useEffect(() => {
    if (state.parentId) {
      if (state.parentGender === 'Male') setFatherId(String(state.parentId));
      else setMotherId(String(state.parentId));
    }
    if (state.father_id) setFatherId(String(state.father_id));
    if (state.mother_id) setMotherId(String(state.mother_id));
    if (state.spouseId) setSpouseId(String(state.spouseId));
  }, [state.parentId, state.parentGender, state.father_id, state.mother_id, state.spouseId]);

  useEffect(() => {
    if (!isEdit) return;
    setFetching(true);
    familyMembersApi
      .get(id)
      .then((r) => {
        const m = r.data;
        setName(m.name || '');
        setSurname(m.surname || '');
        setRelation(m.relation || '');
        setGender(m.gender || '');
        setDateOfBirth(m.date_of_birth ? m.date_of_birth.slice(0, 10) : '');
        setDateOfDeath(m.date_of_death ? m.date_of_death.slice(0, 10) : '');
        setPhone(m.phone || '');
        setEmail(m.email || '');
        setBirthPlace(m.birth_place || '');
        setOccupation(m.occupation || '');
        setNotes(m.notes || '');
        setFatherId(m.father_id ? String(m.father_id) : '');
        setMotherId(m.mother_id ? String(m.mother_id) : '');
        setSpouseId(m.spouse_id ? String(m.spouse_id) : '');
      })
      .catch(() => setError('Failed to load member'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name,
        surname: surname || null,
        relation: relation || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        date_of_death: date_of_death || null,
        phone: phone || null,
        email: email || null,
        birth_place: birth_place || null,
        occupation: occupation || null,
        notes: notes || null,
        father_id: father_id || null,
        mother_id: mother_id || null,
        spouse_id: spouse_id || null,
      };
      if (isEdit) {
        await familyMembersApi.update(id, payload, profileFile || undefined);
      } else {
        const created = await familyMembersApi.create(payload, profileFile || undefined);
        if (state.childId && state.childGender && created?.data?.id) {
          try {
            const childRes = await familyMembersApi.get(state.childId);
            const child = childRes.data;
            const updatePayload = {
              name: child.name,
              surname: child.surname ?? null,
              relation: child.relation ?? null,
              gender: child.gender ?? null,
              date_of_birth: child.date_of_birth ?? null,
              phone: child.phone ?? null,
              email: child.email ?? null,
              birth_place: child.birth_place ?? null,
              occupation: child.occupation ?? null,
              notes: child.notes ?? null,
              father_id: state.childGender === 'Male' ? created.data.id : (child.father_id ?? null),
              mother_id: state.childGender === 'Female' ? created.data.id : (child.mother_id ?? null),
              spouse_id: child.spouse_id ?? null,
            };
            await familyMembersApi.update(state.childId, updatePayload);
          } catch (_) {}
        }
      }
      navigate('/family-members');
    } catch (err) {
      setError(
        err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Save failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const memberOptions = members.map((m) => ({
    value: String(m.id),
    label: [m.name, m.surname].filter(Boolean).join(' ') || `#${m.id}`,
  }));
  const toNum = (v) => (v === '' ? null : v);

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Member' : 'Add Family Member'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/family-members')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Surname</label>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Relation</label>
              <input
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Self, Wife, Son"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date of birth</label>
              <input type="date" value={date_of_birth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date of death</label>
              <input type="date" value={date_of_death} onChange={(e) => setDateOfDeath(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Birth place</label>
              <input value={birth_place} onChange={(e) => setBirthPlace(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Occupation</label>
              <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Father</label>
              <select value={father_id} onChange={(e) => setFatherId(e.target.value)} className={inputClass}>
                <option value="">— None —</option>
                {memberOptions.filter((o) => toNum(o.value) !== toNum(id)).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mother</label>
              <select value={mother_id} onChange={(e) => setMotherId(e.target.value)} className={inputClass}>
                <option value="">— None —</option>
                {memberOptions.filter((o) => toNum(o.value) !== toNum(id)).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Spouse</label>
              <select value={spouse_id} onChange={(e) => setSpouseId(e.target.value)} className={inputClass}>
                <option value="">— None —</option>
                {memberOptions.filter((o) => toNum(o.value) !== toNum(id)).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Add Member'}
          </button>
        </form>
      </div>
    </div>
  );
}
