import { ReactNode } from "react";
import NavBar from "@components/NavBar";
import Sidebar from "@components/Sidebar";

export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <div className="container">
            <aside className="sidebar">
                <Sidebar />
            </aside>
            <main>
                <div className="navbar">
                    <NavBar />
                </div>
                <div className="content">{children}</div>
            </main>
        </div>
    );
}
