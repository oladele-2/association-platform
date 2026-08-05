import { PlaceholderPage } from '../components/ShellLayout';
import { useAuth } from '../lib/auth';
import { useTenant } from '../lib/tenant';
import { ProfilePage } from './member/ProfilePage';
import { DuesPage } from './member/DuesPage';
import { AdminMembersPage } from './admin/AdminMembersPage';

export function MemberDashboard() {
  const { user, shells } = useAuth();
  const { tenant } = useTenant();
  return (
    <div>
      <h1>Member dashboard</h1>
      <p>
        Welcome{user?.email ? `, ${user.email}` : ''}. This is your member shell for{' '}
        {tenant?.organization.displayName ?? 'the organisation'}.
      </p>
      <div className="placeholder">
        <div className="placeholder__eyebrow">Shell ready</div>
        <p>
          Entitled shells: {shells.join(', ')}. Feature screens will connect to billing, CME, and
          profile APIs in later slices.
        </p>
      </div>
    </div>
  );
}

export function InstitutionDashboard() {
  return (
    <div>
      <h1>Institution dashboard</h1>
      <p>Manage affiliated members, balances, and bulk remittance from this shell.</p>
      <div className="placeholder">
        <div className="placeholder__eyebrow">Shell ready</div>
        <p>Live remittance and affiliation screens come after this milestone review.</p>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <div>
      <h1>Admin dashboard</h1>
      <p>Organisation administration: members, finance, CMS, CME review, and settings.</p>
      <div className="placeholder">
        <div className="placeholder__eyebrow">Shell ready</div>
        <p>Admin lists and editors will wire to existing `/v1/admin/*` routes next.</p>
      </div>
    </div>
  );
}

export function memberPlaceholders() {
  return [
    {
      path: 'profile',
      element: <ProfilePage />,
    },
    {
      path: 'id-card',
      element: (
        <PlaceholderPage title="Digital ID" description="Membership card rendering is deferred." />
      ),
    },
    {
      path: 'dues',
      element: <DuesPage />,
    },
    {
      path: 'receipts',
      element: <PlaceholderPage title="Receipts" description="Receipt list from billing APIs." />,
    },
    {
      path: 'cme',
      element: <PlaceholderPage title="CME" description="Member CME submissions." />,
    },
    {
      path: 'events',
      element: <PlaceholderPage title="Events" description="Member event registration." />,
    },
    {
      path: 'documents',
      element: <PlaceholderPage title="Documents" description="Member document downloads." />,
    },
    {
      path: 'notifications',
      element: <PlaceholderPage title="Notifications" description="In-app notifications feed." />,
    },
    {
      path: 'security',
      element: (
        <PlaceholderPage
          title="Account Security"
          description="Password change and session controls."
        />
      ),
    },
  ];
}

export function institutionPlaceholders() {
  return [
    {
      path: 'members',
      element: (
        <PlaceholderPage title="Affiliated Members" description="Institution-scoped member list." />
      ),
    },
    {
      path: 'balances',
      element: (
        <PlaceholderPage
          title="Outstanding Balances"
          description="Dues outstanding for affiliates."
        />
      ),
    },
    {
      path: 'remittance',
      element: (
        <PlaceholderPage
          title="Bulk Remittance"
          description="Create and submit remittance batches."
        />
      ),
    },
    {
      path: 'payments',
      element: (
        <PlaceholderPage title="Payment History" description="Institution payment history." />
      ),
    },
    {
      path: 'reports',
      element: <PlaceholderPage title="Reports" description="Institution reporting." />,
    },
    {
      path: 'profile',
      element: (
        <PlaceholderPage
          title="Institution Profile"
          description="Institution profile management."
        />
      ),
    },
  ];
}

export function adminPlaceholders() {
  return [
    {
      path: 'members',
      element: <AdminMembersPage />,
    },
    {
      path: 'institutions',
      element: <PlaceholderPage title="Institutions" description="Admin institution management." />,
    },
    {
      path: 'membership-types',
      element: (
        <PlaceholderPage
          title="Membership Types & Fields"
          description="Types and custom field definitions."
        />
      ),
    },
    {
      path: 'finance',
      element: (
        <PlaceholderPage
          title="Finance"
          description="Invoices, payment queue, fee schedules, reports."
        />
      ),
    },
    {
      path: 'cme',
      element: <PlaceholderPage title="CME Review" description="Approve or reject CME claims." />,
    },
    {
      path: 'events',
      element: <PlaceholderPage title="Events Admin" description="Manage branch events." />,
    },
    {
      path: 'cms',
      element: <PlaceholderPage title="CMS" description="Pages, news, gallery, executives." />,
    },
    {
      path: 'comms',
      element: <PlaceholderPage title="Communications" description="Templates and campaigns." />,
    },
    {
      path: 'roles',
      element: <PlaceholderPage title="Roles & Users" description="RBAC administration." />,
    },
    {
      path: 'settings',
      element: (
        <PlaceholderPage
          title="Organisation Settings"
          description="Branding, domains, and feature flags."
        />
      ),
    },
    {
      path: 'audit',
      element: <PlaceholderPage title="Audit Log" description="Organisation audit trail." />,
    },
  ];
}
