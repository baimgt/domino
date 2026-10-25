/**
 * ============================================================================
 * PUSAT PENGATURAN APK & INFORMASI GAME (KINGS BILLIARDS & DOMINO)
 * ============================================================================
 * Anda cukup mengubah data di file ini jika ingin mengganti link unduhan,
 * versi APK, ukuran file, atau server unduhan!
 */

export const APP_CONFIG = {
  // Nama Game & Branding
  appName: 'Kings Billiards & Domino',
  subtitle: '& DOMINO CASINO VIP',
  developer: 'Kings Gaming Studio',

  // Versi & Spesifikasi APK
  version: 'v2.79',
  fileSize: '163 MB',
  minAndroid: 'Android 5.0 (Lollipop)+',
  releaseYear: '2026',
  safetyRating: '100% Terverifikasi Bersih & Anti-Banned',

  // ==========================================================================
  // LOKASI & LINK UNDUHAN FILE APK
  // ==========================================================================
  // Opsi 1: File lokal di folder public/assets/ (Direkomendasikan)
  apkFileName: 'kings-billiards-v2.79.apk',
  apkLocalPath: '/assets/kings-billiards-v2.79.apk',

  // Opsi 2: Link eksternal (Jika ingin di-host di Google Drive, Mediafire, S3, dll.)
  // Cukup ganti nilai di bawah ini jika ingin mengarahkan download ke link luar:
  downloadLinks: {
    // Server Utama VIP (Otomatis mengambil file dari public/assets/)
    primaryServer: '/assets/kings-billiards-v2.79.apk',

    // Server Alternatif (Mirror Singapore / Cloud)
    mirrorServer: '/assets/kings-billiards-v2.79.apk',

    // Link Backup Cadangan (misal Google Drive atau Mediafire jika ada)
    googleDriveBackup: 'https://drive.google.com/'
  },

  // Statistik & Social Proof
  stats: {
    totalDownloads: '750.000+',
    totalReviews: '58.400+',
    rating: '4.9 / 5',
    activeOnlinePlayers: '12.480+'
  }
};
