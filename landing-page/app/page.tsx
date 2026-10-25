'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import ParticlesCanvas from '../components/ParticlesCanvas';
import HeroSection from '../components/HeroSection';
import SpecsTable from '../components/SpecsTable';
import GameShowcase from '../components/GameShowcase';
import FeatureHighlights from '../components/FeatureHighlights';
import InstallationGuide from '../components/InstallationGuide';
import LiveDownloadTicker from '../components/LiveDownloadTicker';
import TestimonialsFaq from '../components/TestimonialsFaq';
import Footer from '../components/Footer';
import DownloadModal from '../components/DownloadModal';

export default function HomePage() {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  const handleOpenDownload = () => {
    setIsDownloadOpen(true);
  };

  const handleCloseDownload = () => {
    setIsDownloadOpen(false);
  };

  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* Dynamic Gold Particles Background Engine */}
      <ParticlesCanvas />

      {/* Luxury Sticky Navigation Bar */}
      <Navbar onOpenDownload={handleOpenDownload} />

      {/* Hero Section with Live Online & 3D Showcase */}
      <HeroSection onOpenDownload={handleOpenDownload} />

      {/* Technical Specs & Comparison Table */}
      <SpecsTable onOpenDownload={handleOpenDownload} />

      {/* Interactive Game Catalog (Billiards, Domino, Slots, PvP) */}
      <GameShowcase onOpenDownload={handleOpenDownload} />

      {/* VIP 6-Feature Highlights */}
      <FeatureHighlights />

      {/* 5-Step Android Installation Guide with Brand Switcher */}
      <InstallationGuide onOpenDownload={handleOpenDownload} />

      {/* Real-time Live Download Toast Notification */}
      <LiveDownloadTicker />

      {/* Reviews & Interactive FAQ Accordion */}
      <TestimonialsFaq />

      {/* Bottom CTA Banner & Comprehensive Footer */}
      <Footer onOpenDownload={handleOpenDownload} />

      {/* High-speed VIP Download Modal with Confetti & Direct APK Trigger */}
      <DownloadModal isOpen={isDownloadOpen} onClose={handleCloseDownload} />

    </main>
  );
}
