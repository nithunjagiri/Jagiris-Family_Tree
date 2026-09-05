import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, User, Users, Mail, Phone, MessageCircle, MapPin, Briefcase, Calendar, Activity, X } from 'lucide-react';
import { familyMembersApi, messagesApi } from '../services/api';
import { formatCalendarLong } from '../lib/calendarDate';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { useAppBackNavigation } from '../hooks/useAppBackNavigation';
import { getNavigationOriginPath } from '../lib/navigationOrigin';
import { useAuth } from '../context/AuthContext';
import { toTelE164, whatsAppHref } from '../lib/phoneLinks';
import { memberWishText, senderDisplayName, shouldShowMemberWish } from '../lib/wishMessages';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import WishActions from '../components/WishActions';

const ProfileMiniMap = lazy(() => import('../components/ProfileMiniMap'));

function Field({ icon: Icon, label, value, href }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {href ? (
          <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {value}
          </a>
        ) : (
          <p className="text-gray-900 dark:text-white">{value}</p>
        )}
      </div>
    </div>
  );
}

function spouseDisplayName(s) {
  if (!s) return '';
  return [s.name, s.surname].filter(Boolean).join(' ') || s.name || '';
}

export default function MemberProfile() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const handleBack = useAppBackNavigation();
  const returnTo = location.state?.returnTo || getNavigationOriginPath() || null;
  const [member, setMember] = useState(null);
  const [spouse, setSpouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageErr, setMessageErr] = useState('');

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setMember(null);
      setSpouse(null);
      try {
        const r = await familyMembersApi.get(id);
        if (cancelled) return;
        const m = r.data;
        setMember(m);
        const sid = m?.spouse_id;
        if (sid != null && String(sid).trim() !== '') {
          try {
            const sr = await familyMembersApi.get(sid);
            if (!cancelled) setSpouse(sr.data);
          } catch {
            if (!cancelled) setSpouse(null);
          }
        }
      } catch {
        if (!cancelled) setError('Member not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
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
          onClick={handleBack}
          className="mt-4 text-primary-600 hover:underline dark:text-primary-400"
        >
          Back to Family Members
        </button>
      </div>
    );
  }

  const fullName = [member.name, member.surname].filter(Boolean).join(' ') || member.name;
  const birthPlace = member.birth_place_name || member.birth_place || null;
  const currentCity = member.residence_place_name || member.residence_place || null;
  const wishText = memberWishText(member, senderDisplayName(user));
  const showWish = shouldShowMemberWish(member);
  const phoneTel = toTelE164(member.phone);
  const phoneLink = phoneTel ? `tel:${phoneTel}` : null;
  const waLink = whatsAppHref(member.whatsapp_number);
  const canMessage =
    member.linked_user_id &&
    Number(member.linked_user_id) !== Number(user?.id);

  const handleMessage = async () => {
    setMessageErr('');
    setMessageLoading(true);
    try {
      const { data } = await messagesApi.openThread({ familyMemberId: Number(id) });
      navigate(`/messages/${data.id}`, { state: { returnTo: `/family-members/${id}` } });
    } catch (err) {
      setMessageErr(getApiErrorMessage(err, 'Could not open conversation.'));
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex touch-manipulation items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Link
          to={`/family-members/edit/${id}`}
          state={returnTo ? { returnTo } : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Pencil className="h-4 w-4" />
          Edit Member
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div
              onClick={member.profile_photo ? () => setLightboxOpen(true) : undefined}
              className={`h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700${member.profile_photo ? ' cursor-pointer ring-offset-2 transition-transform hover:scale-105 active:scale-95' : ''}`}
            >
              {member.profile_photo ? (
                <img src={resolveBackendPublicUrl(member.profile_photo)} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <User className="h-12 w-12" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{fullName}</h1>
              {!HIDE_RELATION_NAMES_IN_UI && member.relation ? (
                <p className="text-primary-600 dark:text-primary-400">{member.relation}</p>
              ) : null}
              {showWish ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <WishActions member={member} message={wishText} />
                  {canMessage ? (
                    <button
                      type="button"
                      onClick={handleMessage}
                      disabled={messageLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {messageLoading ? 'Opening…' : 'Message'}
                    </button>
                  ) : null}
                </div>
              ) : canMessage ? (
                <div className="mt-4 flex justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={messageLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {messageLoading ? 'Opening…' : 'Message'}
                  </button>
                </div>
              ) : null}
              {messageErr ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{messageErr}</p>
              ) : null}
            </div>
            {member.birth_place_lat && member.birth_place_lng && (
              <Suspense fallback={<div className="h-28 w-36 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 sm:h-32 sm:w-40" />}>
                <ProfileMiniMap
                  lat={Number(member.birth_place_lat)}
                  lng={Number(member.birth_place_lng)}
                  label={birthPlace}
                />
              </Suspense>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field icon={User} label="Gender" value={member.gender} />
            {spouse && (
              <div className="flex gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Spouse</p>
                  <Link
                    to={`/family-members/${spouse.id}`}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {spouseDisplayName(spouse)}
                  </Link>
                </div>
              </div>
            )}
            <Field
              icon={Activity}
              label="Living status"
              value={(() => {
                const deceased =
                  member.is_alive === false ||
                  (typeof member.is_alive === 'string' && member.is_alive.trim().toLowerCase() === 'no') ||
                  !!member.date_of_death;
                if (!deceased) return 'Yes';
                return member.date_of_death ? 'No' : 'No (death date not recorded)';
              })()}
            />
            <Field icon={Calendar} label="Date of birth" value={member.date_of_birth ? formatCalendarLong(member.date_of_birth) : null} />
            <Field icon={Calendar} label="Date of death" value={member.date_of_death ? formatCalendarLong(member.date_of_death) : null} />
            <Field icon={Calendar} label="Anniversary date" value={member.anniversary_date ? formatCalendarLong(member.anniversary_date) : null} />
            <Field icon={Phone} label="Phone" value={member.phone} href={phoneLink} />
            <Field icon={MessageCircle} label="WhatsApp number" value={member.whatsapp_number} href={waLink} />
            <Field icon={Mail} label="Email" value={member.email} />
            <Field icon={MapPin} label="Birth place" value={birthPlace} />
            <Field icon={MapPin} label="Current Place" value={currentCity} />
            <Field icon={Briefcase} label="Occupation" value={member.occupation} />
            <Field icon={Briefcase} label="Educational qualification" value={member.educational_qualification} />
            <Field icon={User} label="Marital status" value={member.marital_status} />
            <Field icon={Activity} label="Blood group" value={member.blood_group} />
            <Field icon={Activity} label="Privacy level" value={member.privacy_level} />
            <Field icon={User} label="Instagram ID" value={member.instagram_id} />
            <Field icon={User} label="Facebook ID" value={member.facebook_id} />
          </div>
          {member.biography && (
            <div className="mt-6">
              <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Biography</p>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{member.biography}</p>
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && member.profile_photo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-4 px-6" onClick={(e) => e.stopPropagation()}>
            <div className="h-64 w-64 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl sm:h-80 sm:w-80">
              <img
                src={resolveBackendPublicUrl(member.profile_photo)}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-center text-lg font-medium text-white">{fullName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
