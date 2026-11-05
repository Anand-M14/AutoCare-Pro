import { Component } from "react";
import Button from "./Button";

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("UI error:", error?.message); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ui-boundary" role="alert">
        <h1>This page ran into a problem</h1>
        <p style={{ color: "var(--text-2)" }}>Your data is safe. Reload the page to continue.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
