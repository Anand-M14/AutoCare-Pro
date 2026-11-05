import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Logo from "../brand/Logo";
import { Avatar, ErrorBoundary, Icon, IconButton } from "../ui";
import useAuth from "../../hook/useAuth";
import { NAV } from "../../config/navigation";

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => { setOpen(false); window.scrollTo({ top: 0 }); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const items = NAV[user?.role] || [];
  const signOut = () => { logout(); navigate("/login", { replace: true }); };

  return (
    <div className="ui-app">
      <a href="#content" className="sr-only-focus" style={{ position: "absolute", left: -999 }} onFocus={(e) => (e.target.style.left = "8px")} onBlur={(e) => (e.target.style.left = "-999px")}>Skip to content</a>
      <aside className={`ui-rail${open ? " open" : ""}`} aria-label="Main navigation">
        <div className="ui-rail-brand"><Logo size={38} /></div>
        <nav className="ui-nav">
          {items.map((it) => (
            <NavLink key={it.path} to={it.path} end={it.end} title={it.name}>
              <Icon name={it.icon} /><span>{it.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ui-rail-foot">
          <Avatar name={user?.full_name || user?.email} />
          <div className="who"><strong>{user?.full_name || user?.email}</strong><span>{user?.role}</span></div>
          <IconButton className="ui-linkbtn" icon="logout" label="Sign out" onClick={signOut} />
        </div>
      </aside>
      <div className={`ui-scrim${open ? " show" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="ui-main">
        <header className="ui-top">
          <IconButton className="ui-burger" icon="menu" label="Open menu" onClick={() => setOpen(true)} />
          <span className="ui-top-gap" />
          <IconButton icon="expand" label="Toggle full screen" className="ui-hide-sm" onClick={() => (document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.())} />
          <Avatar name={user?.full_name || user?.email} size={36} />
        </header>
        <main className="ui-content" id="content" ref={mainRef}>
          <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
