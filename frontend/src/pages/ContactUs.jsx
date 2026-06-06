import { Link } from 'react-router-dom';
import { Mail, Phone, Clock, MapPin, MessageSquare, ArrowLeft, User, MessageCircle } from 'lucide-react';

/** Defaults for the Jagiris Family Memory administrator; override with VITE_* in `.env` if needed. */
const DEFAULTS = {
  name: 'Nithun Jagiri',
  role: 'Platform administrator',
  email: 'nithun018@gmail.com',
  mobile: '8247369705',
  whatsapp: '9912200704',
};

const contactName = import.meta.env.VITE_CONTACT_ADMIN_NAME || DEFAULTS.name;
const contactRole = import.meta.env.VITE_CONTACT_ADMIN_ROLE || DEFAULTS.role;
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL || DEFAULTS.email).trim();
const contactMobile = (import.meta.env.VITE_CONTACT_PHONE || DEFAULTS.mobile).replace(/\D/g, '');
const contactWhatsapp = (import.meta.env.VITE_CONTACT_WHATSAPP || DEFAULTS.whatsapp).replace(/\D/g, '');
const contactHours = import.meta.env.VITE_CONTACT_HOURS || 'Monday–Friday, 9:00 a.m.–5:00 p.m. (local time)';
const contactLocation = import.meta.env.VITE_CONTACT_LOCATION || '';

function mailHref() {
  const e = contactEmail.toLowerCase();
  if (!e) return null;
  const subject = encodeURIComponent('Jagiris Family Memory — inquiry');
  return `mailto:${e}?subject=${subject}`;
}

/** Indian 10-digit mobiles → +91 for tel / wa.me */
function telIndia(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;
  if (d.startsWith('91') && d.length === 12) return `+${d}`;
  return d ? `+${d}` : '';
}

function waMeHref(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (!d) return null;
  const intl = d.length === 10 ? `91${d}` : d;
  return `https://wa.me/${intl}`;
}

function formatMobileDisplay(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return digits;
}

export default function ContactUs() {
  const emailLink = mailHref();
  const mobileTel = contactMobile ? `tel:${telIndia(contactMobile).replace(/\s/g, '')}` : null;
  const waLink = contactWhatsapp ? waMeHref(contactWhatsapp) : null;

  return (
    <div className="w-full max-w-none">
      <div className="mb-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Contact us</h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
          This archive is maintained for the Jagiris family. For access issues, corrections to records, or general
          questions, please use one of the channels below. Include your registered username and a concise summary of
          your request so we can respond promptly—typically within one business day.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 lg:col-span-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <MessageSquare className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
            Family administrator
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            A single point of contact handles account access and stewardship of shared family data. Messages are
            handled in confidence; please do not send passwords or government ID images by email unless specifically
            requested.
          </p>

          <ul className="mt-8 divide-y divide-gray-100 dark:divide-gray-800">
            <li className="flex gap-4 pb-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
                <User className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</p>
                <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{contactName}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{contactRole}</p>
              </div>
            </li>
            <li className="flex gap-4 py-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
                <Mail className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</p>
                <p className="mt-1">
                  <a
                    href={emailLink || undefined}
                    className="text-base font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {contactEmail}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-4 py-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50">
                <Phone className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mobile</p>
                <p className="mt-1">
                  {mobileTel ? (
                    <a
                      href={mobileTel}
                      className="text-base font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {formatMobileDisplay(contactMobile)}
                    </a>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </p>
              </div>
            </li>
            <li className="flex gap-4 pt-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <MessageCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  WhatsApp
                </p>
                <p className="mt-1">
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {formatMobileDisplay(contactWhatsapp)}
                    </a>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Opens WhatsApp in a new tab or device app when available.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <section className="rounded-2xl border border-gray-200 bg-gray-50/90 p-6 dark:border-gray-800 dark:bg-gray-900/90">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
              Response hours
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{contactHours}</p>
          </section>
          {contactLocation ? (
            <section className="rounded-2xl border border-gray-200 bg-gray-50/90 p-6 dark:border-gray-800 dark:bg-gray-900/90">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                <MapPin className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                Office
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{contactLocation}</p>
            </section>
          ) : null}
          <section className="rounded-2xl border border-primary-200/80 bg-primary-50/70 p-6 dark:border-primary-900/50 dark:bg-primary-950/35">
            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">Professional courtesy</p>
            <p className="mt-2 text-sm leading-relaxed text-primary-900/85 dark:text-primary-200/90">
              For fastest service, message from the phone number or email associated with your account, and avoid
              sharing one-time codes or recovery links in plain text.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
