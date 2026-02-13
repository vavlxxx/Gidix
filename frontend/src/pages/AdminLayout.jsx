import React from "react";
import { Outlet } from "react-router-dom";

import SiteHeader from "../components/SiteHeader";

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <SiteHeader />
      <main className="admin-content">
        <section className="section">
          <div className="section-inner">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
}
