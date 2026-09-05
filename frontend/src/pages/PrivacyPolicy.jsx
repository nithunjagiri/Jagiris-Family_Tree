import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { AuthBranding } from '../components/AuthBranding';
import { useAuth } from '../context/AuthContext';

const APP_NAME = "Jagiri's Kutumbam";
const EFFECTIVE_DATE = '15 August 2026';

/** Same administrator defaults as Contact Us; override with VITE_* in `.env` if needed. */
const DEFAULT_CONTACT = {
  name: 'Nithun Jagiri',
  email: 'nithun018@gmail.com',
  mobile: '8247369705',
};

const contactName = import.meta.env.VITE_CONTACT_ADMIN_NAME || DEFAULT_CONTACT.name;
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL || DEFAULT_CONTACT.email).trim();
const contactMobile = (import.meta.env.VITE_CONTACT_PHONE || DEFAULT_CONTACT.mobile).replace(/\D/g, '');

function telIndia(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;
  if (d.startsWith('91') && d.length === 12) return `+${d}`;
  return d ? `+${d}` : '';
}

function formatMobileDisplay(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return digits;
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const privacyMail = contactEmail
    ? `mailto:${contactEmail.toLowerCase()}?subject=${encodeURIComponent(`${APP_NAME} — Privacy inquiry`)}`
    : null;
  const privacyTel = contactMobile ? `tel:${telIndia(contactMobile)}` : null;
  const privacyPhoneLabel = contactMobile ? formatMobileDisplay(contactMobile) : '';

  return (
    <div className="standalone-page bg-gray-50 px-4 py-10 pb-safe dark:bg-gray-950">
      <div className="mx-auto w-full max-w-3xl">
        <AuthBranding />

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary-600" aria-hidden />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {APP_NAME} · Effective {EFFECTIVE_DATE}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (isAuth ? navigate(-1) : navigate('/login'))}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {isAuth ? 'Back' : 'Back to login'}
            </button>
          </div>

          <div className="space-y-6">
            <Section title="Introduction">
              <p>
                This Privacy Policy explains how {APP_NAME} (&quot;we&quot;, &quot;us&quot;, or &quot;the app&quot;)
                collects, uses, stores, and protects information when you use our family memory web and mobile
                application. By creating an account or using the app, you agree to this policy.
              </p>
            </Section>

            <Section title="Information we collect">
              <p>We collect information you provide and data generated through normal use of the app:</p>
              <ul className="list-inside list-disc space-y-1 pl-1">
                <li>
                  <strong>Account information:</strong> username, email address, password (stored in hashed form),
                  name, gender, phone number, date of birth, profile photo, and optional location fields such as city
                  or village.
                </li>
                <li>
                  <strong>Family member profiles:</strong> names, relationships, dates of birth or death, contact
                  details, photos, occupation, education, marital status, anniversary dates, biography, social links,
                  emergency contacts, and other fields you or administrators enter.
                </li>
                <li>
                  <strong>Photos and media:</strong> images you upload to profiles or the family gallery.
                </li>
                <li>
                  <strong>Events:</strong> titles, dates, descriptions, and optional event images.
                </li>
                <li>
                  <strong>Places:</strong> place names and map coordinates associated with birth or residence locations.
                </li>
                <li>
                  <strong>Notifications:</strong> if you enable push notifications on Android, a device token may be
                  stored so we can send alerts about birthdays, events, and announcements.
                </li>
                <li>
                  <strong>Technical data:</strong> our servers may record standard logs (such as request timestamps and
                  IP addresses) needed for security, troubleshooting, and service operation.
                </li>
              </ul>
            </Section>

            <Section title="How we use your information">
              <ul className="list-inside list-disc space-y-1 pl-1">
                <li>Provide login, registration, and account management.</li>
                <li>Display and manage shared family records, photos, events, and maps for authorized family members.</li>
                <li>Send in-app notifications and, where enabled, mobile push notifications.</li>
                <li>Send password-reset emails or one-time codes when you request account recovery.</li>
                <li>Maintain audit logs of important actions where that feature is enabled.</li>
                <li>Protect the service against abuse, errors, and unauthorized access.</li>
              </ul>
            </Section>

            <Section title="Who can see your information">
              <p>
                {APP_NAME} is designed for a private family workspace. Information you add is generally visible to
                other members of your shared family group according to app permissions and any profile privacy level
                set on a member record. Administrators may have additional access to manage users and review audit
                activity.
              </p>
              <p>
                We do not sell your personal information. We do not use advertising SDKs and we do not sell data to
                advertisers. Sharing is limited to other members of the same family workspace (by design), the
                processors listed under Third-party services, and disclosures required by law.
              </p>
            </Section>

            <Section title="Third-party services">
              <p>We use trusted service providers to operate the app. These may process data on our behalf:</p>
              <ul className="list-inside list-disc space-y-1 pl-1">
                <li>
                  <strong>Hosting providers</strong> (for example Render) to run the API and database.
                </li>
                <li>
                  <strong>Cloudinary</strong> or similar storage services for uploaded images.
                </li>
                <li>
                  <strong>Email providers</strong> (such as Resend or SMTP services) to deliver password-reset messages.
                </li>
                <li>
                  <strong>Google Firebase Cloud Messaging</strong>, only if you opt in to Android push notifications.
                </li>
                <li>
                  <strong>Frontend hosting</strong> (for example Vercel) when you access the web version of the app.
                </li>
              </ul>
              <p>
                These providers are used only to deliver app functionality and are expected to handle data under their
                own privacy terms and applicable law.
              </p>
            </Section>

            <Section title="Data retention">
              <p>
                We retain account and family data for as long as your account is active and as needed to provide the
                service. You may export family member data from the Account &amp; privacy section.
              </p>
              <p>
                You may delete your account from Account &amp; privacy. Account deletion removes your login and
                associated account data. Family records that other members added to the shared workspace may remain
                until an administrator removes them. You may also email the contact address on this page to request
                deletion.
              </p>
            </Section>

            <Section title="Security">
              <p>
                We use industry-standard measures such as password hashing, authenticated API access, and HTTPS for
                data in transit. No method of transmission or storage is completely secure; please use a strong,
                unique password and keep your device locked when others may access it.
              </p>
            </Section>

            <Section title="Your choices">
              <ul className="list-inside list-disc space-y-1 pl-1">
                <li>Update your profile from Account &amp; privacy.</li>
                <li>Export or delete your account from Account &amp; privacy.</li>
                <li>Decline or revoke notification permission on your Android device.</li>
                <li>Contact us to ask questions about your data.</li>
              </ul>
            </Section>

            <Section title="Children">
              <p>
                App accounts are for authorized adult users. Children should not create their own accounts. Family
                members may add a child&apos;s name, date of birth, and photos as part of family records. That
                information is stored only in the private family workspace and is not used for advertising.
              </p>
              <p>
                To correct or remove a child&apos;s record, use the app (member or administrator tools) or contact us
                using the email or phone number on this page.
              </p>
            </Section>

            <Section title="Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. The effective date at the top of this page will
                change when we do. Continued use of the app after updates means you accept the revised policy.
              </p>
            </Section>

            <Section title="Contact us">
              <p>
                For privacy questions or requests regarding your data, contact {contactName}:
              </p>
              <ul className="list-inside list-disc space-y-1 pl-1">
                {privacyMail ? (
                  <li>
                    Email:{' '}
                    <a href={privacyMail} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                      {contactEmail}
                    </a>
                  </li>
                ) : null}
                {privacyTel ? (
                  <li>
                    Phone:{' '}
                    <a href={privacyTel} className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                      {privacyPhoneLabel}
                    </a>
                  </li>
                ) : null}
              </ul>
              <p>You can also use the in-app Contact page after signing in.</p>
            </Section>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-200 pt-6 text-sm dark:border-gray-700">
            <Link to="/register" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Create account
            </Link>
            <Link to="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
