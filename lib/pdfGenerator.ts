import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfDataPayload {
  user: {
    uid?: string | null;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    emailVerified?: boolean;
    creationTime?: string;
    lastSignInTime?: string;
  };
  profile: any;
  watchlist: any[];
  userReviews: any[];
  activeSessions: any[];
  auditLogs?: any[];
  searchHistory?: any[];
}

export const generateUserDataPdf = (data: PdfDataPayload): { blob: Blob; base64: string } => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const DARK_BG: [number, number, number] = [12, 12, 12];
  const CARD_BG: [number, number, number] = [22, 22, 22];
  const ALT_BG:  [number, number, number] = [17, 17, 17];
  const BORDER:  [number, number, number] = [40, 40, 40];
  const BRAND:   [number, number, number] = [255, 40, 78];
  const WHITE:   [number, number, number] = [255, 255, 255];
  const MUTED:   [number, number, number] = [120, 120, 120];
  const HEAD_BG: [number, number, number] = [35, 8, 14];

  const PAGE_W = doc.internal.pageSize.width;
  const PAGE_H = doc.internal.pageSize.height;

  // Track which absolute PDF pages have been painted already
  // (hookData.pageNumber is RELATIVE per table, not the absolute PDF page)
  const paintedPages = new Set<number>();

  const paintPageBackground = (absolutePage: number) => {
    if (paintedPages.has(absolutePage)) return; // already painted — don't erase table content
    paintedPages.add(absolutePage);

    doc.setFillColor(...DARK_BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    if (absolutePage === 1) {
      drawPage1Header();
    } else {
      // Subtle continuation header
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, PAGE_W, 1.5, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text('STREAMFIND — Personal Data Archive', 14, 9);
      doc.text(`Page ${absolutePage}`, PAGE_W - 14, 9, { align: 'right' });
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.line(14, 12, PAGE_W - 14, 12);
    }
  };

  // willDrawPage fires BEFORE rows — use absolute page to avoid double-painting
  const willDrawPage = (hookData: any) => {
    // startPageNumber is the absolute PDF page where this table began
    const tableStart: number = hookData.table?.startPageNumber ?? 1;
    const relPage: number = hookData.pageNumber ?? 1;
    const absolutePage = tableStart + relPage - 1;
    paintPageBackground(absolutePage);
  };

  const drawPage1Header = () => {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, PAGE_W, 2, 'F');
    doc.setTextColor(...BRAND);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('STREAMFIND', 14, 14);
    doc.setTextColor(...WHITE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Personal Data Archive', 14, 22);
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(
      `Account: ${data.user.displayName || 'Unknown'}  •  ${data.user.email || ''}`,
      14, 37,
    );
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.4);
    doc.line(14, 43, PAGE_W - 14, 43);
  };

  // Paint page 1 manually before any autoTable calls
  paintPageBackground(1);

  // Shared table config
  const baseStyles = {
    theme: 'grid' as const,
    margin: { left: 14, right: 14 },
    styles: {
      fillColor: CARD_BG,
      textColor: WHITE,
      lineColor: BORDER,
      lineWidth: 0.2,
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: HEAD_BG,
      textColor: BRAND,
      fontStyle: 'bold' as const,
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: ALT_BG },
    willDrawPage,
  };

  const sectionLabel = (title: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BRAND);
    doc.text(title.toUpperCase(), 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
  };

  const fmt = (v: any): string => {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
    return String(v);
  };

  let y = 50;

  // ── 1. Account Info ─────────────────────────────────────────────────────────
  sectionLabel('Account Information', y);
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    head: [['Field', 'Value']],
    body: [

      ['Display Name',       fmt(data.user.displayName)],
      ['Email',              fmt(data.user.email)],
      ['Email Verified',     fmt(data.user.emailVerified)],
      ['Account Created',    fmt(data.user.creationTime)],
      ['Last Sign In',       fmt(data.user.lastSignInTime)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  // ── 2. Profile & Preferences ─────────────────────────────────────────────────
  sectionLabel('Profile & Preferences', y);
  const p = data.profile || {};
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    head: [['Setting', 'Value']],
    body: [
      ['Bio',                    fmt(p.bio)],
      ['Primary Content',        fmt(p.prefContentType)],
      ['Preferred Language',     fmt(p.prefLanguage)],
      ['Watch Region',           fmt(p.watchRegion)],
      ['Favorite Genres',        fmt(p.favoriteGenres)],
      ['Subscriptions',          fmt(p.subscriptions)],
      ['Moods (DNA)',            fmt(p.dnaMoods)],
      ['Runtime Preference',     fmt(p.dnaRuntime)],
      ['Auto-Filter',            fmt(p.autoFilter)],
      ['Profile Public',         fmt(p.isPublic)],
      ['Avatar Frame',           fmt(p.avatarFrame)],
      ['Weekly Digest Email',    fmt(p.weeklyDigest)],
      ['Notify: New Releases',   fmt(p.notifyNewRelease)],
      ['Notify: Fav Genres',     fmt(p.notifyFavGenres)],
      ['Notify: Leaving Soon',   fmt(p.notifyLeavingSoon)],
      ['Notify: New Episodes',   fmt(p.notifyNewEpisodes)],
      ['Notify: New Seasons',    fmt(p.notifyNewSeasons)],
      ['Notify: Platform Added', fmt(p.notifyPlatformAdded)],
      ['Notify: New Features',   fmt(p.notifyNewFeatures)],
      ['Notify: Trending Genres',fmt(p.notifyTrendingGenres)],
      ['Notify: Watch Recs',     fmt(p.notifyWatchHistoryRecs)],
      ['Notify: Similar Content',fmt(p.notifySimilarContent)],
      ['Channel: Email',         fmt(p.channelEmail)],
      ['Channel: Push',          fmt(p.channelPush)],
      ['Channel: Browser',       fmt(p.channelBrowser)],
      ['Security: New Device',   fmt(p.securityAlertNewDevice)],
      ['Security: Suspicious',   fmt(p.securityAlertSuspicious)],
      ['Security: Profile Change',fmt(p.securityAlertProfileChange)],
      ['Security: Weekly Digest',fmt(p.securityAlertWeeklyDigest)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  // ── 3. Watchlist ─────────────────────────────────────────────────────────────
  sectionLabel('Watchlist', y);
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    head: [['#', 'Title', 'Type', 'Added On']],
    body: data.watchlist.length
      ? data.watchlist.map((item, i) => [
          String(i + 1),
          item.title || item.name || 'Unknown',
          item.media_type || 'movie',
          item.addedAt
            ? new Date(item.addedAt.seconds * 1000).toLocaleDateString()
            : '—',
        ])
      : [['—', 'Watchlist is empty', '—', '—']],
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  // ── 4. Reviews & Ratings ─────────────────────────────────────────────────────
  sectionLabel('Reviews & Ratings', y);
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    columnStyles: { 2: { cellWidth: 70 } },
    head: [['Movie', 'Rating', 'Review Text', 'Date']],
    body: data.userReviews.length
      ? data.userReviews.map(rev => [
          rev.movieTitle || rev.movieId || rev.id || 'Unknown',
          rev.rating != null ? `${rev.rating}/10` : 'N/A',
          rev.review || '—',
          rev.createdAt
            ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString()
            : '—',
        ])
      : [['—', '—', 'No reviews written yet', '—']],
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  // ── 5. Active Sessions ────────────────────────────────────────────────────────
  sectionLabel('Active Devices / Sessions', y);
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    columnStyles: { 0: { cellWidth: 50 }, 3: { cellWidth: 40 } },
    head: [['Device', 'Last Active', 'Location', 'This Device?']],
    body: data.activeSessions.length
      ? data.activeSessions.map(s => [
          s.device || 'Unknown Device',
          s.lastActive || '—',
          s.location || 'Unavailable',
          s.current ? 'This device' : '—',
        ])
      : [['—', '—', '—', '—']],
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  // ── 6. Search History ─────────────────────────────────────────────────────────
  const searches = data.searchHistory || [];
  sectionLabel('Search History', y);
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    head: [['#', 'Query', 'Date']],
    body: searches.length
      ? searches.map((s, i) => [
          String(i + 1),
          s.query || s.term || s.id || '—',
          s.searchedAt
            ? new Date(s.searchedAt.seconds * 1000).toLocaleDateString()
            : s.timestamp
            ? new Date(s.timestamp.seconds * 1000).toLocaleDateString()
            : '—',
        ])
      : [['—', 'No search history', '—']],
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  // ── 7. Account Activity / Audit Logs ─────────────────────────────────────────
  const logs = data.auditLogs || [];
  sectionLabel('Account Activity Log', y);
  autoTable(doc, {
    ...baseStyles,
    startY: y + 4,
    columnStyles: { 1: { cellWidth: 50 }, 2: { cellWidth: 80 } },
    head: [['Date', 'Event', 'Details']],
    body: logs.length
      ? logs.map(log => [
          log.timestamp
            ? new Date(log.timestamp.seconds * 1000).toLocaleString()
            : log.time || '—',
          log.event || log.action || log.type || '—',
          log.details || log.description || log.message || '—',
        ])
      : [['—', 'No activity logs recorded', '—']],
  });

  // ── Footer on every page ─────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      '© 2026 StreamFind. Generated securely for your account only. Do not share this document.',
      PAGE_W / 2,
      PAGE_H - 6,
      { align: 'center' },
    );
  }

  const blob   = doc.output('blob');
  const base64 = doc.output('datauristring').split(',')[1];

  return { blob, base64 };
};
