import { Component, useEffect, useRef, type ReactNode } from 'react';
import {
  HashRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { Applications, Dashboard, Documents, Settings } from './features/pages';
import { EmailProvider, useEmail } from './features/email-context';
import { useWorkspace } from './features/workspace';
import { Button } from './components/ui/button';
import { ROUTES } from './routing/routes';
const navigation = [
  { path: ROUTES.dashboard, label: 'Overview', icon: LayoutDashboard },
  { path: ROUTES.applications, label: 'Applications', icon: BriefcaseBusiness },
  { path: ROUTES.documents, label: 'CV library', icon: FileText },
  { path: ROUTES.settings, label: 'Workspace', icon: Settings2 },
];
function Shell() {
  const workspace = useWorkspace();
  const location = useLocation();
  const email = useEmail();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const label =
      navigation.find((n) => n.path === location.pathname)?.label ?? 'Overview';
    document.title = `${label} · Roleward`;
    main.current?.focus();
  }, [location.pathname]);
  const current =
    navigation.find((n) => n.path === location.pathname)?.label ?? 'Overview';
  return (
    <div className="app-layout">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to={ROUTES.dashboard} className="brand">
          <span className="brand-mark">
            <Leaf size={25} strokeWidth={1.6} />
          </span>
          roleward<span className="brand-period">.</span>
        </Link>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-active' : ''}`
              }
            >
              <Icon size={19} />
              {label}
              {path === '/applications' && workspace && (
                <span className="nav-count">
                  {workspace.applications.filter((a) => a.confirmed).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-leaf">
              <Leaf size={22} />
            </span>
            <strong>
              Your pace.
              <br />
              Your next chapter.
            </strong>
            <p>
              A little organisation.
              <br />A little more possibility.
            </p>
          </div>
          <div className="profile">
            <span className="profile-avatar">Y</span>
            <span>
              <strong>Your workspace</strong>
              <small>Personal · Local storage</small>
            </span>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="main-layout">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>{current}</span>
          </div>
          <Link to={ROUTES.settings} className="topbar-connection">
            <span
              className={`connection-dot ${email.connectedCount ? 'online' : ''}`}
            />
            {email.connectedCount
              ? `${email.connectedCount} inbox${email.connectedCount === 1 ? '' : 'es'} connected`
              : 'Connect your inbox'}
            <ArrowUpRight size={14} />
          </Link>
        </header>
        <main
          id="main-content"
          className="main-content"
          tabIndex={-1}
          ref={main}
        >
          {!workspace ? (
            <div className="loading-state" role="status">
              <LoaderCircle className="spin" />
              Opening your workspace…
            </div>
          ) : workspace.error ? (
            <div className="notice notice-error" role="alert">
              <h1>We couldn't open your workspace</h1>
              <p>{workspace.error}</p>
              <p>
                Check that browser storage is enabled, close other Roleward
                tabs, and try again. Your data has not been reset.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          ) : (
            <Routes>
              <Route
                path={ROUTES.home}
                element={<Navigate to={ROUTES.dashboard} replace />}
              />
              <Route
                path={ROUTES.dashboard}
                element={<Dashboard workspace={workspace} />}
              />
              <Route
                path={ROUTES.applications}
                element={<Applications workspace={workspace} />}
              />
              <Route
                path={ROUTES.documents}
                element={<Documents workspace={workspace} />}
              />
              <Route
                path={ROUTES.settings}
                element={<Settings workspace={workspace} />}
              />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>Page not found</h1>
                    <Link to={ROUTES.dashboard}>Return to your overview</Link>
                  </div>
                }
              />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="main-content">
        <h1>Something interrupted your workspace.</h1>
        <p>Your saved data has not been reset. Reload the page to try again.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <EmailProvider>
          <Shell />
        </EmailProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
