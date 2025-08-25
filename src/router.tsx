import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Dashboard from "@pages/Dashboard";
import Diary from "@pages/Diary";
import Ledger from "@pages/Ledger";
import Analysis from "@pages/Analysis";
import Recommendations from "@pages/Recommendations";
import Rewards from "@pages/Rewards";
import Share from "@pages/Share";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            { index: true, element: <Dashboard /> },
            { path: "diary", element: <Diary /> },
            { path: "ledger", element: <Ledger /> },
            { path: "analysis", element: <Analysis /> },
            { path: "recommendations", element: <Recommendations /> },
            { path: "rewards", element: <Rewards /> },
            { path: "share", element: <Share /> }
        ]
    }
]);
