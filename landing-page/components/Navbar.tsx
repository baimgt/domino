'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Menu, X, ShieldCheck, Sparkles } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface NavbarProps {
  onOpenDownload: () => void;
}

export default function Navbar({ onOpenDownload }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#080a10]/85 backdrop-blur-md border-b border-[#F5C518]/25 shadow-2xl shadow-black/80 py-3'
          : 'bg-transparent py-5'
      }`}
      style={{
        transition: 'all 0.3s ease',
        background: isScrolled ? 'rgba(8, 10, 16, 0.9)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(245, 197, 24, 0.25)' : '1px solid transparent',
        padding: isScrolled ? '12px 0' : '20px 0'
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo & Title */}
        <a
          href="#hero"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            textDecoration: 'none',
            color: 'inherit'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 16px rgba(245, 197, 24, 0.5)',
              border: '2px solid rgba(245, 197, 24, 0.7)'
            }}
          >
            <Image
              src="/assets/kings_billiards_logo.png"
              alt="Kings Billiards Logo"
              width={46}
              height={46}
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '0.5px' }}>
                KINGS <span className="text-gold">BILLIARDS</span>
              </span>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10B981',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                {APP_CONFIG.version}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#A0AEC0', letterSpacing: '1.5px', fontWeight: 600 }}>
              {APP_CONFIG.subtitle}
            </div>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '28px'
          }}
          className="desktop-nav"
        >
          <a href="#hero" className="nav-item">Beranda</a>
          <a href="#spesifikasi" className="nav-item">Spesifikasi</a>
          <a href="#games" className="nav-item">Permainan</a>
          <a href="#fitur" className="nav-item">Fitur VIP</a>
          <a href="#panduan" className="nav-item">Cara Install</a>
          <a href="#faq" className="nav-item">FAQ</a>
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onOpenDownload}
            className="btn-gold"
            style={{
              padding: '11px 22px',
              fontSize: '0.92rem',
              borderRadius: '10px'
            }}
          >
            <Download size={17} />
            <span>Unduh APK</span>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mobile-toggle-btn"
            aria-label="Toggle Menu"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              borderRadius: '8px',
              color: '#FFFFFF',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          style={{
            background: 'rgba(10, 13, 22, 0.98)',
            borderBottom: '1px solid rgba(245, 197, 24, 0.3)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
          }}
        >
          <a
            href="#hero"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#FFF', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600 }}
          >
            Beranda
          </a>
          <a
            href="#spesifikasi"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#FFF', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600 }}
          >
            Spesifikasi & Keamanan
          </a>
          <a
            href="#games"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#FFF', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600 }}
          >
            Daftar Permainan
          </a>
          <a
            href="#fitur"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#FFF', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600 }}
          >
            Fitur Unggulan VIP
          </a>
          <a
            href="#panduan"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#FFF', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600 }}
          >
            Panduan Cara Install
          </a>
          <a
            href="#faq"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{ color: '#FFF', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600 }}
          >
            FAQ & Bantuan
          </a>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenDownload();
            }}
            className="btn-gold"
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
          >
            <Download size={18} />
            <span>Download APK Resmi (v2.79)</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .nav-item {
          color: #A0AEC0;
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 600;
          transition: color 0.2s ease;
          position: relative;
        }
        .nav-item:hover {
          color: #F5C518;
        }
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
