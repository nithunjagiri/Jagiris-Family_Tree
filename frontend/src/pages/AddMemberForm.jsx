import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { familyMembersApi, placesApi } from '../services/api';
import { cn } from '../lib/utils';
import {
  RELATION_OTHERS_VALUE,
  resolveRelationForPayload,
  splitStoredRelation,
  getRelationSelectOptions,
} from '../lib/relationOptions';
import { findDuplicateMembers } from '../lib/memberDuplicates';
import DuplicateMemberModal from '../components/DuplicateMemberModal';
import { buildMemberLinkOptions } from '../lib/memberSelectOptions';
import SearchableSelect from '../components/SearchableSelect';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import {
  compressImageFile,
  formatFileSize,
  IMAGE_ACCEPTED_TYPES,
  ONE_MB,
} from '../lib/imageProcessing';
import ImageCropModal from '../components/ImageCropModal';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';

const PROFILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_MAX_SIZE_LABEL = '5 MB';
const PROFILE_TARGET_SIZE_BYTES = ONE_MB;
const PROFILE_TARGET_SIZE_LABEL = '1 MB';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

const relationSelectOptions = getRelationSelectOptions();
const MARITAL_STATUS_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
  { value: 'other', label: 'Other' },
];
const PRIVACY_LEVEL_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'public', label: 'Public' },
  { value: 'family', label: 'Family only' },
  { value: 'admin_only', label: 'Admin only' },
];
const OTHER_PLACE_VALUE = '__other__';
const BLOOD_GROUP_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

/** Normalize API row so edit form shows correct radios (varchar, boolean, or legacy null). */
function livingFromMember(m) {
  const death = m.date_of_death ? String(m.date_of_death).slice(0, 10) : '';
  const v = m.is_alive;
  if (v === false || v === 0) return false;
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (t === 'no' || t === 'false' || t === '0') return false;
    if (t === 'yes' || t === 'true' || t === '1') return true;
  }
  return !death;
}

export default function AddMemberForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const state = location.state || {};
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [relationSelect, setRelationSelect] = useState('');
  const [relationOtherText, setRelationOtherText] = useState('');
  const [gender, setGender] = useState('');
  const [date_of_birth, setDateOfBirth] = useState('');
  const [date_of_death, setDateOfDeath] = useState('');
  /** true = living (no date_of_death); false = deceased */
  const [isAlive, setIsAlive] = useState(true);
  const [phone, setPhone] = useState('');
  const [whatsapp_number, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [birth_place, setBirthPlace] = useState('');
  const [birth_place_id, setBirthPlaceId] = useState('');
  const [birthPlaceChoice, setBirthPlaceChoice] = useState('');
  const [residence_place_id, setResidencePlaceId] = useState('');
  const [residence_place, setResidencePlace] = useState('');
  const [currentCityChoice, setCurrentCityChoice] = useState('');
  const [occupation, setOccupation] = useState('');
  const [educational_qualification, setEducationalQualification] = useState('');
  const [marital_status, setMaritalStatus] = useState('');
  const [anniversary_date, setAnniversaryDate] = useState('');
  const [blood_group, setBloodGroup] = useState('');
  const [privacy_level, setPrivacyLevel] = useState('');
  const [biography, setBiography] = useState('');
  const [instagram_id, setInstagramId] = useState('');
  const [facebook_id, setFacebookId] = useState('');
  const [placeOptions, setPlaceOptions] = useState([]);
  const [father_id, setFatherId] = useState('');
  const [mother_id, setMotherId] = useState('');
  const [spouse_id, setSpouseId] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [existingProfilePhoto, setExistingProfilePhoto] = useState(null);
  const [profileProcessing, setProfileProcessing] = useState(false);
  const [profileCropOpen, setProfileCropOpen] = useState(false);
  const profileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupMatches, setDupMatches] = useState([]);
  const [dupDobDiffers, setDupDobDiffers] = useState(false);

  useEffect(() => {
    Promise.all([familyMembersApi.list(), placesApi.list()])
      .then(([membersRes, placesRes]) => {
        setMembers(membersRes.data || []);
        const pins = placesRes.data?.pins || [];
        setPlaceOptions(pins.map((p) => ({ id: String(p.id), name: p.name })));
      })
      .catch(() => {
        setMembers([]);
        setPlaceOptions([]);
      });
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
        const rel = splitStoredRelation(m.relation);
        setRelationSelect(rel.relationSelect);
        setRelationOtherText(rel.relationOtherText);
        setGender(m.gender || '');
        setDateOfBirth(m.date_of_birth ? m.date_of_birth.slice(0, 10) : '');
        const death = m.date_of_death ? m.date_of_death.slice(0, 10) : '';
        setDateOfDeath(death);
        setIsAlive(livingFromMember(m));
        setPhone(m.phone || '');
        setWhatsappNumber(m.whatsapp_number || '');
        setEmail(m.email || '');
        setBirthPlace(m.birth_place || '');
        setBirthPlaceId(m.birth_place_id ? String(m.birth_place_id) : '');
        setResidencePlaceId(m.residence_place_id ? String(m.residence_place_id) : '');
        setResidencePlace(m.residence_place || '');
        setOccupation(m.occupation || '');
        setEducationalQualification(m.educational_qualification || '');
        setMaritalStatus(m.marital_status || '');
        setAnniversaryDate(m.anniversary_date ? m.anniversary_date.slice(0, 10) : '');
        setBloodGroup(m.blood_group || '');
        setPrivacyLevel(m.privacy_level || '');
        setBiography(m.biography || '');
        setInstagramId(m.instagram_id || '');
        setFacebookId(m.facebook_id || '');
        setFatherId(m.father_id ? String(m.father_id) : '');
        setMotherId(m.mother_id ? String(m.mother_id) : '');
        setSpouseId(m.spouse_id ? String(m.spouse_id) : '');
        setExistingProfilePhoto(m.profile_photo || null);
      })
      .catch(() => setError('Failed to load member'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  useEffect(() => {
    if (birth_place_id) {
      setBirthPlaceChoice(String(birth_place_id));
    } else if ((birth_place || '').trim()) {
      setBirthPlaceChoice(OTHER_PLACE_VALUE);
    } else {
      setBirthPlaceChoice('');
    }
  }, [birth_place_id, birth_place]);

  useEffect(() => {
    if (residence_place_id) {
      setCurrentCityChoice(String(residence_place_id));
    } else if ((residence_place || '').trim()) {
      setCurrentCityChoice(OTHER_PLACE_VALUE);
    } else {
      setCurrentCityChoice('');
    }
  }, [residence_place_id, residence_place]);

  const buildPayload = useCallback(
    (living) => {
      const resolvedRelation = resolveRelationForPayload(relationSelect, relationOtherText);
      return {
        name,
        surname: surname || null,
        relation: resolvedRelation ?? null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        date_of_death: living ? null : date_of_death || null,
        is_alive: living ? 'Yes' : 'No',
        phone: phone || null,
        whatsapp_number: whatsapp_number || null,
        email: email || null,
        birth_place: birth_place || null,
        birth_place_id: birth_place_id || null,
        residence_place_id: residence_place_id || null,
        residence_place: residence_place || null,
        occupation: occupation || null,
        educational_qualification: educational_qualification || null,
        marital_status: marital_status || null,
        anniversary_date: anniversary_date || null,
        blood_group: blood_group || null,
        privacy_level: privacy_level || null,
        biography: biography || null,
        instagram_id: instagram_id || null,
        facebook_id: facebook_id || null,
        father_id: father_id || null,
        mother_id: mother_id || null,
        spouse_id: spouse_id || null,
      };
    },
    [
      name,
      surname,
      relationSelect,
      relationOtherText,
      gender,
      date_of_birth,
      date_of_death,
      phone,
      whatsapp_number,
      email,
      birth_place,
      birth_place_id,
      residence_place_id,
      residence_place,
      occupation,
      educational_qualification,
      marital_status,
      anniversary_date,
      blood_group,
      privacy_level,
      biography,
      instagram_id,
      facebook_id,
      father_id,
      mother_id,
      spouse_id,
    ]
  );

  const saveMember = useCallback(async () => {
    const living = isAlive;
    const payload = buildPayload(living);
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
            date_of_death: child.date_of_death ?? null,
            is_alive:
              child.is_alive === 'Yes' || child.is_alive === 'No'
                ? child.is_alive
                : child.date_of_death
                  ? 'No'
                  : 'Yes',
            phone: child.phone ?? null,
            whatsapp_number: child.whatsapp_number ?? null,
            email: child.email ?? null,
            birth_place: child.birth_place ?? null,
            birth_place_id: child.birth_place_id ?? null,
            residence_place_id: child.residence_place_id ?? null,
            residence_place: child.residence_place ?? null,
            occupation: child.occupation ?? null,
            educational_qualification: child.educational_qualification ?? null,
            marital_status: child.marital_status ?? null,
            anniversary_date: child.anniversary_date ?? null,
            blood_group: child.blood_group ?? null,
            privacy_level: child.privacy_level ?? null,
            biography: child.biography ?? null,
            instagram_id: child.instagram_id ?? null,
            facebook_id: child.facebook_id ?? null,
            father_id: state.childGender === 'Male' ? created.data.id : (child.father_id ?? null),
            mother_id: state.childGender === 'Female' ? created.data.id : (child.mother_id ?? null),
            spouse_id: child.spouse_id ?? null,
          };
          await familyMembersApi.update(state.childId, updatePayload);
        } catch (_) {}
      }
    }
    const display = [name, surname].filter(Boolean).join(' ').trim() || String(name || '').trim() || 'Member';
    navigate('/family-members', {
      state: {
        memberSavedMessage: isEdit
          ? `Saved changes for ${display}.`
          : `${display} was added to your family list.`,
      },
    });
  }, [buildPayload, isAlive, isEdit, id, profileFile, state.childId, state.childGender, navigate, name, surname]);

  const runSaveAfterDuplicateCheck = useCallback(
    async (skipDuplicateCheck) => {
      setError('');
      if (profileFile?.size > PROFILE_MAX_SIZE_BYTES) {
        setError('Please compress or crop the profile photo before saving.');
        return;
      }
      /* Duplicate warning is only for new members; edits save without this step. */
      if (!skipDuplicateCheck && !isEdit) {
        const { matches, dobDiffersFromForm } = findDuplicateMembers(
          members,
          { name, surname, gender },
          undefined,
          date_of_birth
        );
        if (matches.length > 0) {
          setDupMatches(matches);
          setDupDobDiffers(dobDiffersFromForm);
          setDupModalOpen(true);
          return;
        }
      }
      setLoading(true);
      try {
        await saveMember();
      } catch (err) {
        setError(getApiErrorMessage(err, 'Save failed'));
      } finally {
        setLoading(false);
      }
    },
    [members, name, surname, gender, date_of_birth, isEdit, saveMember, profileFile]
  );

  const handleProfileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, or WebP images are allowed for profile photo.');
      return;
    }
    setError(
      file.size > PROFILE_MAX_SIZE_BYTES
        ? `Profile photo is ${formatFileSize(file.size)}. Compress or crop it before saving.`
        : ''
    );
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const processProfilePhoto = async (cropSquare = false) => {
    if (!profileFile) return;
    setProfileProcessing(true);
    setError('');
    try {
      const processed = await compressImageFile(profileFile, {
        targetBytes: PROFILE_TARGET_SIZE_BYTES,
        cropSquare,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      setProfileFile(processed);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      setProfilePreview(URL.createObjectURL(processed));
      if (processed.size > PROFILE_MAX_SIZE_BYTES) {
        setError(`${processed.name} is still larger than ${PROFILE_MAX_SIZE_LABEL}. Try crop + compress.`);
      }
    } catch (err) {
      setError(err.message || 'Could not process profile photo.');
    } finally {
      setProfileProcessing(false);
    }
  };

  const applyCroppedProfilePhoto = (cropped) => {
    setProfileFile(cropped);
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview(URL.createObjectURL(cropped));
    setProfileCropOpen(false);
    setError('');
  };

  const clearProfilePhoto = () => {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfileFile(null);
    setProfilePreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    void runSaveAfterDuplicateCheck(false);
  };

  const handleDuplicateCancel = () => {
    setDupModalOpen(false);
    setDupMatches([]);
  };

  const handleDuplicateProceed = () => {
    setDupModalOpen(false);
    setDupMatches([]);
    void runSaveAfterDuplicateCheck(true);
  };

  const memberOptions = useMemo(
    () =>
      buildMemberLinkOptions(members, {
        excludeId: isEdit && id != null && id !== '' ? Number(id) : null,
      }),
    [members, isEdit, id]
  );
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
          <div className={cn('grid gap-6', !HIDE_RELATION_NAMES_IN_UI && 'sm:grid-cols-2')}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  — Select —
                </option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {!HIDE_RELATION_NAMES_IN_UI ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Relation</label>
                <select
                  value={relationSelect}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRelationSelect(v);
                    if (v !== RELATION_OTHERS_VALUE) setRelationOtherText('');
                  }}
                  className={inputClass}
                >
                  <option value="">— None —</option>
                  {relationSelectOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value={RELATION_OTHERS_VALUE}>Others</option>
                </select>
              </div>
            ) : null}
          </div>
          {!HIDE_RELATION_NAMES_IN_UI && relationSelect === RELATION_OTHERS_VALUE ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Specify relation
              </label>
              <input
                value={relationOtherText}
                onChange={(e) => setRelationOtherText(e.target.value)}
                placeholder="Optional — if empty, saves as Others only"
                className={inputClass}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date of birth</label>
            <input type="date" value={date_of_birth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Is alive</legend>
            <div className="flex flex-wrap gap-6">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input
                  type="radio"
                  name="isAlive"
                  value="Yes"
                  checked={isAlive}
                  onChange={() => {
                    setIsAlive(true);
                    setDateOfDeath('');
                  }}
                  className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                />
                Yes
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input
                  type="radio"
                  name="isAlive"
                  value="No"
                  checked={!isAlive}
                  onChange={() => setIsAlive(false)}
                  className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
                />
                No
              </label>
            </div>
          </fieldset>
          <div>
            <label
              className={cn(
                'mb-1.5 block text-sm font-medium',
                isAlive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
              )}
            >
              Date of death
            </label>
            <input
              type="date"
              value={date_of_death}
              onChange={(e) => setDateOfDeath(e.target.value)}
              disabled={isAlive}
              className={cn(
                inputClass,
                isAlive && 'cursor-not-allowed opacity-50 dark:opacity-40'
              )}
              aria-disabled={isAlive}
            />
            {isAlive && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only if the person is not alive.</p>
            )}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp number</label>
              <input type="tel" value={whatsapp_number} onChange={(e) => setWhatsappNumber(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Occupation</label>
              <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Birth place</label>
              <select
                value={birthPlaceChoice}
                onChange={(e) => {
                  const v = e.target.value;
                  setBirthPlaceChoice(v);
                  if (v === OTHER_PLACE_VALUE) {
                    setBirthPlaceId('');
                  } else {
                    setBirthPlaceId(v || '');
                    setBirthPlace('');
                  }
                }}
                className={inputClass}
              >
                <option value="">— None —</option>
                {placeOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value={OTHER_PLACE_VALUE}>Other</option>
              </select>
              {birthPlaceChoice === OTHER_PLACE_VALUE && (
                <input
                  value={birth_place}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  className={cn(inputClass, 'mt-2')}
                  placeholder="Enter birth place"
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current city</label>
              <select
                value={currentCityChoice}
                onChange={(e) => {
                  const v = e.target.value;
                  setCurrentCityChoice(v);
                  if (v === OTHER_PLACE_VALUE) {
                    setResidencePlaceId('');
                  } else {
                    setResidencePlaceId(v || '');
                    setResidencePlace('');
                  }
                }}
                className={inputClass}
              >
                <option value="">— None —</option>
                {placeOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value={OTHER_PLACE_VALUE}>Other</option>
              </select>
              {currentCityChoice === OTHER_PLACE_VALUE && (
                <input
                  value={residence_place}
                  onChange={(e) => setResidencePlace(e.target.value)}
                  className={cn(inputClass, 'mt-2')}
                  placeholder="Enter current city"
                />
              )}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Educational qualification</label>
              <input value={educational_qualification} onChange={(e) => setEducationalQualification(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Marital status</label>
              <select value={marital_status} onChange={(e) => setMaritalStatus(e.target.value)} className={inputClass}>
                {MARITAL_STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Anniversary date</label>
              <input type="date" value={anniversary_date} onChange={(e) => setAnniversaryDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Blood group</label>
              <select value={blood_group} onChange={(e) => setBloodGroup(e.target.value)} className={inputClass}>
                {BLOOD_GROUP_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Profile privacy level</label>
              <select value={privacy_level} onChange={(e) => setPrivacyLevel(e.target.value)} className={inputClass}>
                {PRIVACY_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Instagram ID</label>
              <input value={instagram_id} onChange={(e) => setInstagramId(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Facebook ID</label>
              <input value={facebook_id} onChange={(e) => setFacebookId(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Biography</label>
            <textarea value={biography} onChange={(e) => setBiography(e.target.value)} rows={3} className={inputClass} />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Father</label>
              <SearchableSelect
                value={father_id}
                onChange={setFatherId}
                options={memberOptions.filter((o) => toNum(o.value) !== toNum(id))}
                placeholder="— None —"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mother</label>
              <SearchableSelect
                value={mother_id}
                onChange={setMotherId}
                options={memberOptions.filter((o) => toNum(o.value) !== toNum(id))}
                placeholder="— None —"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Spouse</label>
              <SearchableSelect
                value={spouse_id}
                onChange={setSpouseId}
                options={memberOptions.filter((o) => toNum(o.value) !== toNum(id))}
                placeholder="— None —"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</label>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleProfileSelect}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                {profilePreview ? (
                  <img src={profilePreview} alt="" className="h-full w-full object-cover" />
                ) : existingProfilePhoto ? (
                  <img
                    src={resolveBackendPublicUrl(existingProfilePhoto)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  JPEG, PNG, GIF, or WebP. Max {PROFILE_MAX_SIZE_LABEL}. Use crop to center the face in the circle.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => profileInputRef.current?.click()}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-600"
                  >
                    Choose photo
                  </button>
                  {profileFile && (
                    <>
                      <button
                        type="button"
                        onClick={() => processProfilePhoto(false)}
                        disabled={profileProcessing}
                        className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {profileProcessing ? 'Processing...' : `Compress to ${PROFILE_TARGET_SIZE_LABEL}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileCropOpen(true)}
                        disabled={profileProcessing}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-600"
                      >
                        Crop &amp; adjust
                      </button>
                      <button
                        type="button"
                        onClick={clearProfilePhoto}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 dark:border-red-900/50 dark:text-red-400"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
                {profileFile && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Selected: {formatFileSize(profileFile.size)}
                    {profileFile.size > PROFILE_MAX_SIZE_BYTES ? (
                      <span className="ml-1 text-amber-700 dark:text-amber-300">(over {PROFILE_MAX_SIZE_LABEL})</span>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || profileProcessing}
            className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {loading ? 'Saving...' : profileProcessing ? 'Processing photo...' : isEdit ? 'Update' : 'Add Member'}
          </button>
        </form>
      </div>

      <ImageCropModal
        open={profileCropOpen}
        file={profileFile}
        title="Crop profile photo"
        targetBytes={PROFILE_TARGET_SIZE_BYTES}
        onClose={() => setProfileCropOpen(false)}
        onApply={applyCroppedProfilePhoto}
      />

      <DuplicateMemberModal
        open={dupModalOpen}
        matches={dupMatches}
        dobDiffersFromForm={dupDobDiffers}
        onCancel={handleDuplicateCancel}
        onProceed={handleDuplicateProceed}
      />
    </div>
  );
}
