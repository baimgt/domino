'use client';

import { useState } from 'react';
import { Star, MessageCircle, HelpCircle, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function TestimonialsFaq() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const testimonials = [
    {
      name: 'Dimas Wicaksono',
      city: 'Jakarta Barat',
      rating: 5,
      date: 'Kemarin',
      role: 'VIP Sultan Tier 3',
      comment: 'Billiard 8-ball nya beneran 60 FPS licin banget! Gak ada delay pas mukul stik. Yang paling top fitur transfer koin ke temen lancar jaya tanpa potongan.'
    },
    {
      name: 'Yudi Pratama',
      city: 'Surabaya',
      rating: 5,
      date: '3 hari lalu',
      role: 'Juara Turnamen Gaple',
      comment: 'Game Gaple dan QiuQiu paling asik se-Indonesia. Desain grafisnya kelihatan berkelas banget gak murahan kayak game domino lainnya.'
    },
    {
      name: 'Reza Fahmi',
      city: 'Medan',
      rating: 5,
      date: '1 minggu lalu',
      role: 'Pemain Slot Gatotkaca',
      comment: 'Slot Gates of Gatotkaca nya gacor parah, baru deposit dikit udah tembus jackpot petir 500x. Download dari link ini aman banget tanpa virus!'
    }
  ];

  const faqs = [
    {
      q: 'Apakah file APK Kings Billiards & Domino ini aman untuk HP saya?',
      a: 'Sangat aman 100%. File APK v2.79 ini telah lolos pemindaian Google Play Protect dan antivirus terkemuka. Tidak ada malware, trojan, maupun spyware tersembunyi.'
    },
    {
      q: 'Mengapa game ini didownload lewat situs ini sebelum masuk Play Store?',
      a: 'Ini merupakan versi pra-rilis resmi eksklusif bagi komunitas pemain awal sebelum peluncuran massal di Google Play Store. Pemain versi pra-rilis mendapatkan bonus chip spesial 10 Juta Koin dan akses awal ke fitur transfer bebas biaya.'
    },
    {
      q: 'Apakah saya bisa mengirimkan koin chip ke teman saya?',
      a: 'Bisa! Fitur Kirim Koin (Transfer Koin) dapat digunakan langsung di dalam profil game ke sesama ID pemain lain tanpa biaya admin yang memberatkan.'
    },
    {
      q: 'Bagaimana cara menghubungkan akun saya agar tidak hilang?',
      a: 'Anda dapat masuk (Login) langsung menggunakan akun Google resmi. Progres level, chip koin, avatar, dan riwayat pertandingan Anda tersimpan aman di cloud server kami.'
    },
    {
      q: 'Apa yang harus dilakukan jika muncul notifikasi "Aplikasi Tidak Terpasang"?',
      a: 'Pastikan ruang penyimpanan internal HP Anda memiliki sisa minimal 500 MB. Jika Anda memiliki versi aplikasi lama yang tidak resmi, silakan hapus (uninstall) terlebih dahulu sebelum memasang APK v2.79 resmi ini.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <section id="faq" className="section-wrapper" style={{ background: 'rgba(9, 12, 19, 0.45)' }}>
      <div className="container">
        
        {/* Testimonials Block */}
        <div className="section-header">
          <div className="section-tag">
            <MessageCircle size={14} />
            <span>Ulasan Komunitas Pemain</span>
          </div>
          <h2 className="section-title">
            Apa Kata <span className="text-gold">Para Pemain Kami?</span>
          </h2>
          <p className="section-subtitle">
            Bergabunglah dengan lebih dari 750.000 pemain aktif di seluruh nusantara.
          </p>
        </div>

        <div className="reviews-grid">
          {testimonials.map((review, i) => (
            <div key={i} className="review-card glass-panel">
              <div className="review-header">
                <div>
                  <div className="reviewer-name">{review.name}</div>
                  <div className="reviewer-sub">{review.city} • {review.role}</div>
                </div>
                <div className="stars-row">
                  {[...Array(review.rating)].map((_, s) => (
                    <Star key={s} size={14} fill="#F5C518" color="#F5C518" />
                  ))}
                </div>
              </div>
              <p className="review-comment">"{review.comment}"</p>
              <div className="verified-buyer">
                <CheckCircle2 size={14} className="text-green" />
                <span>Pemain Terverifikasi</span>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Block */}
        <div style={{ marginTop: '90px' }}>
          <div className="section-header">
            <div className="section-tag">
              <HelpCircle size={14} />
              <span>Pusat Informasi & FAQ</span>
            </div>
            <h2 className="section-title">
              Pertanyaan yang Sering <span className="text-gold">Ditanyakan</span>
            </h2>
            <p className="section-subtitle">
              Jawaban seputar download, pemasangan aplikasi, dan keamanan akun Kings Billiards & Domino.
            </p>
          </div>

          <div className="faq-container">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className={`faq-item glass-panel ${isOpen ? 'open' : ''}`}>
                  <button onClick={() => toggleFaq(index)} className="faq-question">
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={20}
                      className="faq-arrow"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <style jsx>{`
        .reviews-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .review-card {
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
        }
        .review-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .reviewer-name {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 800;
          color: #FFFFFF;
        }
        .reviewer-sub {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .stars-row {
          display: flex;
          gap: 2px;
        }
        .review-comment {
          font-size: 0.92rem;
          color: #E2E8F0;
          line-height: 1.6;
          font-style: italic;
          margin-bottom: 16px;
          flex: 1;
        }
        .verified-buyer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          color: #10B981;
          font-weight: 700;
        }

        /* FAQ Styles */
        .faq-container {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .faq-item {
          overflow: hidden;
          transition: all 0.25s ease;
        }
        .faq-item.open {
          border-color: rgba(245, 197, 24, 0.45);
        }
        .faq-question {
          width: 100%;
          padding: 20px 24px;
          background: none;
          border: none;
          color: #FFFFFF;
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .faq-question:hover {
          color: #FDE047;
        }
        .faq-answer {
          padding: 0 24px 22px 24px;
          color: var(--text-secondary);
          font-size: 0.94rem;
          line-height: 1.65;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }

        @media (max-width: 992px) {
          .reviews-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
