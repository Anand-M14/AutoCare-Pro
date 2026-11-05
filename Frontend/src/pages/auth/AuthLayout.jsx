import { Link } from "react-router-dom";
import Logo from "../../components/brand/Logo";
import { Icon } from "../../components/ui";
import heroCar from "../../assets/car.webp";

const POINTS = [
  ["car", "Cars and bikes", "One garage for every vehicle you own."],
  ["clipboard", "Know where your vehicle is", "Follow each step from booking to handover."],
  ["mail", "Updates by email", "Approvals, status changes and pickup alerts."],
];

/** Split screen: brand and imagery on the left, the form on the right. */
export default function AuthLayout({ title, intro, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-art" aria-hidden="false">
        <img className="auth-car" src={heroCar} alt="" />
        <div className="auth-art-in">
          <Link to="/login" aria-label="AutoCare Pro home"><Logo size={42} /></Link>
          <div>
            <h2>Service that moves as fast as you do.</h2>
            <ul>
              {POINTS.map(([icon, t, s]) => (
                <li key={t}><Icon name={icon} size={20} /><div><b>{t}</b><span>{s}</span></div></li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo size={36} /></div>
          <h1>{title}</h1>
          {intro && <p className="auth-intro">{intro}</p>}
          {children}
          {footer && <p className="auth-foot">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
