import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/system/ScrollToTop";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import HomePage from "@/pages/HomePage";

const LiveMusicPage = lazy(() => import("@/pages/LiveMusicPage"));
const SecondhandPage = lazy(() => import("@/pages/SecondhandPage"));
const FoodPage = lazy(() => import("@/pages/FoodPage"));
const ActivitiesPage = lazy(() => import("@/pages/ActivitiesPage"));
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const LocationDetailPage = lazy(() => import("@/pages/LocationDetailPage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const FindMyVibePage = lazy(() => import("@/pages/FindMyVibePage"));
const BoardsPage = lazy(() => import("@/pages/BoardsPage"));
const SubmitPage = lazy(() => import("@/pages/SubmitPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-paper/15 border-t-acid" />
        <p className="label-mono mt-4 text-concrete">LOADING FRAME</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-acid focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-normal focus:text-ink"
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <ScrollToTop />
        <Header />
        <main id="main" className="flex-1">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/locations/:slug" element={<LocationDetailPage />} />
              <Route path="/live-music" element={<LiveMusicPage />} />
              <Route path="/secondhand" element={<SecondhandPage />} />
              <Route path="/food" element={<FoodPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/find-my-vibe" element={<FindMyVibePage />} />
              <Route path="/boards" element={<BoardsPage />} />
              <Route path="/submit" element={<SubmitPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
