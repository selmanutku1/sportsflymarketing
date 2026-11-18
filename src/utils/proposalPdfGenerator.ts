import { jsPDF } from 'jspdf';
import type {
  AthleteTier,
  Club,
  ClubAttachment,
  Contact,
  ProductModule,
  ProductPackage,
  Quote,
  QuoteRequest,
  User,
} from '../types/crm';
import { formatDateTR, formatNumberTR, formatTRY } from './formatters';

export const SPORTSFLY_LOGO_URL = '/assets/aistudio/images__1__e22ba1d6.jpg';

export type ProposalFormat = '1-sayfa' | '2-sayfa' | '3-sayfa';

export const PROPOSAL_FORMAT_OPTIONS: Array<{
  id: ProposalFormat;
  shortLabel: string;
  label: string;
  pageCount: number;
  description: string;
}> = [
  {
    id: '1-sayfa',
    shortLabel: '1 Sayfa · Hızlı',
    label: '1 Sayfa — Hızlı Teklif',
    pageCount: 1,
    description: 'Özet fayda, seçilen paket, net fiyat ve imza tek sayfada',
  },
  {
    id: '2-sayfa',
    shortLabel: '2 Sayfa · Önerilen',
    label: '2 Sayfa — Yönetici Özeti',
    pageCount: 2,
    description: 'Sayfa 1: Fayda ve kapsam · Sayfa 2: Fiyat, 3 adımda başlangıç ve onay',
  },
  {
    id: '3-sayfa',
    shortLabel: '3 Sayfa · Kurumsal',
    label: '3 Sayfa — Kurumsal Teklif',
    pageCount: 3,
    description: 'Sadeleştirilmiş paket karşılaştırması ve 5 günlük geçiş planı dahil',
  },
];

// SportsFly Kurumsal Marka Paleti (sportsfly.com.tr)
const BRAND_NAVY = '#091124';
const BRAND_BLUE = '#0b5fff';
const BRAND_LIME = '#b9f33d';
const BRAND_SLATE_BG = '#f7f9fc';
const BRAND_BORDER = '#e4e9f2';
const BRAND_MUTED = '#64748b';
const BRAND_BODY = '#334155';
const FONT_SANS = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

interface PageCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function sanitizeSlug(text: string): string {
  const map: Record<string, string> = {
    ç: 'c',
    Ç: 'C',
    ğ: 'g',
    Ğ: 'G',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ş: 's',
    Ş: 'S',
    ü: 'u',
    Ü: 'U',
  };
  return text
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string,
  strokeStyle?: string,
  lineWidth = 1.5
) {
  traceRoundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function createA4Canvas(): PageCanvas {
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D bağlamı oluşturulamadı.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx, width, height };
}

function drawPageHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  logo: HTMLImageElement | null,
  clubName: string,
  validUntilStr: string
) {
  const marginX = 80;

  ctx.fillStyle = BRAND_NAVY;
  ctx.fillRect(0, 0, width * 0.82, 12);
  ctx.fillStyle = BRAND_LIME;
  ctx.fillRect(width * 0.82, 0, width * 0.18, 12);

  if (logo) {
    fillRoundedRect(ctx, marginX, 38, 54, 54, 10, '#ffffff', BRAND_BORDER, 1.5);
    ctx.save();
    traceRoundedRect(ctx, marginX + 2, 40, 50, 50, 8);
    ctx.clip();
    ctx.drawImage(logo, marginX + 2, 40, 50, 50);
    ctx.restore();
  }

  const textStartX = logo ? marginX + 68 : marginX;
  ctx.font = `700 26px ${FONT_SANS}`;
  ctx.fillStyle = BRAND_NAVY;
  ctx.fillText('Sports', textStartX, 74);
  const sportsWidth = ctx.measureText('Sports').width;
  ctx.fillStyle = BRAND_BLUE;
  ctx.fillText('Fly', textStartX + sportsWidth, 74);

  // Sağ üst köşe: Spor Kulübü İsmi ve Teklif Geçerlilik Tarihi
  ctx.textAlign = 'right';
  ctx.fillStyle = BRAND_NAVY;
  ctx.font = `700 16px ${FONT_SANS}`;
  const clubLines = wrapLines(ctx, clubName, 540).slice(0, 1);
  ctx.fillText(clubLines[0], width - marginX, 60);

  ctx.fillStyle = BRAND_MUTED;
  ctx.font = `500 13px ${FONT_SANS}`;
  ctx.fillText(`Teklif Geçerlilik Tarihi: ${validUntilStr}`, width - marginX, 84);
  ctx.textAlign = 'left';

  ctx.strokeStyle = BRAND_BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX, 114);
  ctx.lineTo(width - marginX, 114);
  ctx.stroke();
}

function drawPageFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clubName: string,
  dateStr: string
) {
  const marginX = 80;
  ctx.strokeStyle = BRAND_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, height - 84);
  ctx.lineTo(width - marginX, height - 84);
  ctx.stroke();

  ctx.fillStyle = BRAND_MUTED;
  ctx.font = `400 13px ${FONT_SANS}`;
  ctx.fillText(
    `SportsFly Bilişim Teknolojileri · ${clubName} için özel hazırlanmıştır · ${dateStr}`,
    marginX,
    height - 52
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = BRAND_NAVY;
  ctx.font = `600 13px ${FONT_SANS}`;
  ctx.fillText('0216 850 19 07 · www.sportsfly.com.tr', width - marginX, height - 52);
  ctx.textAlign = 'left';
}

function drawSignaturePair(
  ctx: CanvasRenderingContext2D,
  marginX: number,
  contentW: number,
  y: number,
  sigH: number,
  clubName: string,
  owner?: User,
  contact?: Contact
) {
  const sigW = (contentW - 32) / 2;
  const drawBox = (
    bx: number,
    heading: string,
    person: string,
    sub: string,
    topColor: string
  ) => {
    fillRoundedRect(ctx, bx, y, sigW, sigH, 10, '#ffffff', BRAND_BORDER, 1.5);
    fillRoundedRect(ctx, bx, y, sigW, 6, 3, topColor);

    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 16px ${FONT_SANS}`;
    ctx.fillText(heading, bx + 22, y + 36);

    ctx.fillStyle = BRAND_BODY;
    ctx.font = `500 14px ${FONT_SANS}`;
    ctx.fillText(person, bx + 22, y + 62);
    ctx.fillText(sub, bx + 22, y + 84);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 22, y + sigH - 42);
    ctx.lineTo(bx + sigW - 22, y + sigH - 42);
    ctx.stroke();

    ctx.fillStyle = BRAND_MUTED;
    ctx.font = `400 13px ${FONT_SANS}`;
    ctx.fillText('Kaşe / İmza / Tarih', bx + 22, y + sigH - 20);
  };

  drawBox(
    marginX,
    'SportsFly Bilişim Teknolojileri',
    owner?.name ?? 'SportsFly Satış Ekibi',
    owner?.title ?? 'Kurumsal Satış Temsilcisi',
    BRAND_NAVY
  );
  drawBox(
    marginX + sigW + 32,
    clubName,
    contact?.fullName ?? 'Kulüp Yetkilisi',
    contact?.roleTitle ?? 'Yetkili İmza',
    BRAND_LIME
  );
}

function drawDigitalApprovalBanner(
  ctx: CanvasRenderingContext2D,
  marginX: number,
  contentW: number,
  y: number,
  token: string
) {
  fillRoundedRect(ctx, marginX, y, contentW, 78, 12, BRAND_NAVY);
  fillRoundedRect(ctx, marginX, y, 8, 78, 4, BRAND_LIME);
  ctx.fillStyle = BRAND_LIME;
  ctx.font = `700 15px ${FONT_SANS}`;
  ctx.fillText(`Dijital Onay Bağlantısı: /onay/${token}`, marginX + 26, y + 32);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `400 14px ${FONT_SANS}`;
  ctx.fillText(
    'Kulüp yetkilisi bu bağlantı üzerinden teklifi tek tıkla onaylayabilir veya revizyon talep edebilir.',
    marginX + 26,
    y + 58
  );
}

function drawSummaryAndRulesBlock(
  ctx: CanvasRenderingContext2D,
  marginX: number,
  width: number,
  y: number,
  quote: Quote,
  validUntilStr: string
) {
  const latest = quote.versions[quote.versions.length - 1];
  const isYearly = latest.billingCycle === 'yillik';
  const annualPrepaidWithVat = Math.round(
    latest.annualPrepaidAmount * (1 + latest.vatRate / 100)
  );
  const sumBoxW = 500;
  const sumBoxX = width - marginX - sumBoxW;
  const boxH = 286;

  fillRoundedRect(ctx, sumBoxX, y, sumBoxW, boxH, 12, BRAND_SLATE_BG, BRAND_NAVY, 1.5);

  const hasPrepaidExtra = Boolean(latest.prepaidEnabled && (latest.prepaidDiscountPercent ?? 0) > 0);
  let sy = y + (hasPrepaidExtra ? 25 : 28);
  const rowStep = hasPrepaidExtra ? 23 : latest.annualPlanDiscountPercent > 0 ? 26 : 30;
  const drawSumRow = (label: string, val: string, color = BRAND_NAVY) => {
    ctx.fillStyle = BRAND_BODY;
    ctx.font = `500 13px ${FONT_SANS}`;
    ctx.fillText(label, sumBoxX + 24, sy);

    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = `600 13px ${FONT_SANS}`;
    ctx.fillText(val, sumBoxX + sumBoxW - 24, sy);
    ctx.textAlign = 'left';
    sy += rowStep;
  };

  if (latest.annualPlanDiscountPercent > 0) {
    drawSumRow(
      '12 Aylık Liste Tutarı',
      formatTRY(latest.annualListTotal ?? latest.monthlyListAmount * 12),
      BRAND_MUTED
    );
    drawSumRow(
      `Yıllık Plan İndirimi (%${latest.annualPlanDiscountPercent})`,
      `-${formatTRY(latest.annualPlanSavingsAmount)}`,
      '#15803d'
    );
    drawSumRow('Yıllık Peşin Ara Toplam', formatTRY(latest.subtotal));
  } else {
    drawSumRow('Ara Toplam', formatTRY(latest.subtotal));
  }
  drawSumRow(
    `Ek Kurumsal İndirim (%${latest.discountPercent})`,
    `-${formatTRY(latest.discountAmount)}`,
    '#b91c1c'
  );
  if (hasPrepaidExtra) {
    drawSumRow(
      `Yıllık Peşin Ekstra İndirim (%${latest.prepaidDiscountPercent})`,
      `-${formatTRY(latest.prepaidDiscountAmount ?? 0)}`,
      '#15803d'
    );
  }
  drawSumRow(
    'Toplam İndirim Oranı',
    `%${latest.effectiveTotalDiscountPercent}`,
    BRAND_BLUE
  );
  drawSumRow('Net Tutar (KDV Hariç)', formatTRY(latest.netTotal));
  drawSumRow(`KDV (%${latest.vatRate})`, `+${formatTRY(latest.vatAmount)}`);

  fillRoundedRect(ctx, sumBoxX, y + boxH - 80, sumBoxW, 80, 10, BRAND_NAVY);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 14px ${FONT_SANS}`;
  ctx.fillText(
    isYearly ? 'YILLIK PEŞİN TOPLAM (KDV DAHİL)' : 'AYLIK TOPLAM (KDV DAHİL)',
    sumBoxX + 24,
    y + boxH - 46
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = BRAND_LIME;
  ctx.font = `700 21px ${FONT_SANS}`;
  ctx.fillText(
    `${formatTRY(latest.grandTotal)}${!isYearly ? ' / ay' : ''}`,
    sumBoxX + sumBoxW - 24,
    y + boxH - 45
  );
  ctx.textAlign = 'left';

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sumBoxX + 24, y + boxH - 33);
  ctx.lineTo(sumBoxX + sumBoxW - 24, y + boxH - 33);
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `500 12px ${FONT_SANS}`;
  ctx.fillText(
    isYearly ? 'Aylık Net Karşılık (KDV Hariç)' : 'Yıllık Peşin Seçilirse (%20 Avantaj)',
    sumBoxX + 24,
    y + boxH - 13
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 13px ${FONT_SANS}`;
  ctx.fillText(
    isYearly
      ? `${formatTRY(Math.round(latest.netTotal / 12), false)} / ay`
      : formatTRY(annualPrepaidWithVat),
    sumBoxX + sumBoxW - 24,
    y + boxH - 13
  );
  ctx.textAlign = 'left';

  const leftBoxW = sumBoxX - marginX - 24;
  fillRoundedRect(ctx, marginX, y, leftBoxW, boxH, 12, '#ffffff', BRAND_BORDER, 1.5);
  fillRoundedRect(ctx, marginX, y, leftBoxW, 6, 3, BRAND_LIME);

  ctx.fillStyle = BRAND_NAVY;
  ctx.font = `700 17px ${FONT_SANS}`;
  ctx.fillText('Koşullar ve Güvence', marginX + 22, y + 38);
  ctx.fillStyle = BRAND_BODY;
  ctx.font = `400 14px ${FONT_SANS}`;

  const notes = [
    `• Ödeme Planı: ${isYearly ? 'Yıllık Peşin (%20 İndirim Aktif)' : 'Aylık Ödeme'} · Toplam %${latest.effectiveTotalDiscountPercent} indirim.`,
    `• Geçerlilik: ${quote.validityDays} gün (${validUntilStr} tarihine kadar).`,
    quote.requiresDualApproval
      ? `• İndirim Onayı: %${latest.discountPercent} ek indirim Yönetici & Finans onaylıdır.`
      : `• Başlangıç: Mevcut Excel listenizle ek cihaz gerekmeden hızlı kurulum.`,
    `• KVKK Güvencesi: Tüm veriler rol yetkili ve şifreli altyapıda saklanır.`,
  ];

  let ny = y + 72;
  notes.forEach((n) => {
    wrapLines(ctx, n, leftBoxW - 44).forEach((l) => {
      ctx.fillText(l, marginX + 22, ny);
      ny += 21;
    });
    ny += 10;
  });
}

// ---------------------------------------------------------------------------
// FORMAT 1: 1 SAYFA — HIZLI TEKLİF
// ---------------------------------------------------------------------------
function buildOnePageProposal(params: {
  logo: HTMLImageElement | null;
  quote: Quote;
  club?: Club;
  contact?: Contact;
  owner?: User;
  pkg?: ProductPackage;
  tier?: AthleteTier;
  modules: ProductModule[];
  clubName: string;
  dateStr: string;
  validUntilStr: string;
}): PageCanvas[] {
  const { logo, quote, club, contact, owner, pkg, tier, modules, clubName, dateStr, validUntilStr } =
    params;
  const latest = quote.versions[quote.versions.length - 1];
  const p1 = createA4Canvas();
  const { ctx, width, height } = p1;
  const marginX = 80;
  const contentW = width - marginX * 2;

  drawPageHeader(ctx, width, logo, clubName, validUntilStr);

  // Kompakt Kapak Şeridi
  let y = 138;
  const heroH = 176;
  fillRoundedRect(ctx, marginX, y, contentW, heroH, 14, BRAND_NAVY);
  ctx.fillStyle = BRAND_LIME;
  ctx.fillRect(marginX + 32, y + 26, 48, 5);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 30px ${FONT_SANS}`;
  ctx.fillText(clubName, marginX + 32, y + 72);

  ctx.fillStyle = BRAND_LIME;
  ctx.font = `700 19px ${FONT_SANS}`;
  ctx.fillText(quote.templateName, marginX + 32, y + 106);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = `400 14px ${FONT_SANS}`;
  ctx.fillText(
    'Aidat takibini otomatikleştirin; yoklama, dijital karne ve veli iletişimini tek panelden yönetin.',
    marginX + 32,
    y + 142
  );

  // Orta 2 Sütun: Sol = Kulüp & Yetkili, Sağ = 3 Net Fayda
  y += heroH + 26;
  const colW = (contentW - 22) / 2;
  const midH = 248;

  // Sol kutu
  fillRoundedRect(ctx, marginX, y, colW, midH, 12, '#ffffff', BRAND_BORDER, 1.5);
  ctx.fillStyle = BRAND_NAVY;
  ctx.font = `700 16px ${FONT_SANS}`;
  ctx.fillText('Kulüp ve Teklif Özeti', marginX + 22, y + 34);

  const isYearly = latest.billingCycle === 'yillik';
  const metaRows: Array<[string, string]> = [
    ['Kulüp', `${clubName} (${club?.city ?? '—'})`],
    ['Ölçek', `${formatNumberTR(latest.athleteCount)} sporcu · ${club?.branches.join(', ') ?? '—'}`],
    ['Yetkili', `${contact?.fullName ?? '—'} (${contact?.roleTitle ?? 'Yetkili'})`],
    ['Geçerlilik', `${dateStr} → ${validUntilStr} (${quote.validityDays} gün)`],
    ['Paket & Plan', `${pkg?.name ?? 'Sadece Ek Modüller'} (${isYearly ? 'Yıllık Peşin' : 'Aylık'})`],
  ];
  let my = y + 66;
  metaRows.forEach(([k, v]) => {
    ctx.fillStyle = BRAND_MUTED;
    ctx.font = `500 13px ${FONT_SANS}`;
    ctx.fillText(k, marginX + 22, my);
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `600 13px ${FONT_SANS}`;
    const lines = wrapLines(ctx, v, colW - 130).slice(0, 1);
    ctx.fillText(lines[0], marginX + 112, my);
    my += 34;
  });

  // Sağ kutu: 3 Net Fayda
  const rx = marginX + colW + 22;
  fillRoundedRect(ctx, rx, y, colW, midH, 12, BRAND_SLATE_BG, BRAND_BORDER, 1.5);
  ctx.fillStyle = BRAND_NAVY;
  ctx.font = `700 16px ${FONT_SANS}`;
  ctx.fillText('Kulübünüze 3 Somut Katkısı', rx + 22, y + 34);

  const quickBenefits = [
    ['1. Otomatik Aidat', 'Velilere WhatsApp/SMS ödeme linki gider; gecikmeler azalır.'],
    ['2. Cepten Yoklama & Karne', 'Antrenör sahadan yoklama alır, veliye gelişim karnesi ulaşır.'],
    ['3. Aynı Hafta Kurulum', 'Mevcut Excel listenizle ek cihaz olmadan hemen başlarsınız.'],
  ];
  let qy = y + 70;
  quickBenefits.forEach(([t, d]) => {
    fillRoundedRect(ctx, rx + 22, qy - 12, 8, 8, 4, BRAND_BLUE);
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 14px ${FONT_SANS}`;
    ctx.fillText(t, rx + 40, qy - 4);
    ctx.fillStyle = BRAND_BODY;
    ctx.font = `400 13px ${FONT_SANS}`;
    wrapLines(ctx, d, colW - 62)
      .slice(0, 2)
      .forEach((l, i) => ctx.fillText(l, rx + 40, qy + 16 + i * 18));
    qy += 58;
  });

  // Fiyat Kalemleri Tablosu (Özet ve sade)
  y += midH + 26;
  fillRoundedRect(ctx, marginX, y, contentW, 44, 8, BRAND_NAVY);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 14px ${FONT_SANS}`;
  ctx.fillText('Kapsam Kalemi', marginX + 20, y + 27);
  ctx.fillText('Detay', marginX + 460, y + 27);
  ctx.textAlign = 'right';
  ctx.fillStyle = BRAND_LIME;
  ctx.fillText(
    isYearly ? 'Yıllık Peşin (KDV Hariç)' : 'Aylık Tutar (KDV Hariç)',
    width - marginX - 20,
    y + 27
  );
  ctx.textAlign = 'left';
  y += 44;

  const moduleNames = latest.selectedModules
    .map((k) => {
      const base = modules.find((m) => m.key === k)?.name ?? k;
      if (k === 'SportsFlyLab' && !pkg?.includedModules.includes(k)) {
        return `${base} (${formatNumberTR(latest.labAthleteCount ?? latest.athleteCount)} sporcu)`;
      }
      if (k === 'TurnuvaFikstur' && latest.tournamentMode === 'single') {
        return `${base} (Tek Turnuva)`;
      }
      return base;
    })
    .join(', ');

  const tableRows: Array<[string, string, string]> = pkg
    ? [
        [pkg.name, 'Temel kulüp yönetim ve tahsilat altyapısı', formatTRY(latest.packageBaseAmount)],
        [
          `Sporcu Kapasite Kademesi (${tier?.label ?? 'Standart'})`,
          `${formatNumberTR(latest.athleteCount)} aktif sporcu ölçeği`,
          `+${formatTRY(latest.tierAdjustmentAmount)}`,
        ],
        [
          `Seçili Modüller (${latest.selectedModules.length} modül)`,
          moduleNames.length > 56 ? `${moduleNames.slice(0, 55)}...` : moduleNames,
          latest.addonModulesAmount > 0 ? `+${formatTRY(latest.addonModulesAmount)}` : 'Pakete Dahil',
        ],
      ]
    : [
        [
          'Ana Paket Durumu',
          `Paket seçilmedi (Modül bazlı teklif · ${formatNumberTR(latest.athleteCount)} sporcu)`,
          '—',
        ],
        [
          `Seçili Ek Modüller (${latest.selectedModules.length} modül)`,
          moduleNames.length > 56 ? `${moduleNames.slice(0, 55)}...` : moduleNames,
          `+${formatTRY(latest.addonModulesAmount)}`,
        ],
      ];

  tableRows.forEach(([title, scope, price], idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : BRAND_SLATE_BG;
    ctx.fillRect(marginX, y, contentW, 48);
    ctx.strokeStyle = BRAND_BORDER;
    ctx.strokeRect(marginX, y, contentW, 48);

    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText(title, marginX + 20, y + 29);
    ctx.fillStyle = BRAND_MUTED;
    ctx.font = `400 13px ${FONT_SANS}`;
    ctx.fillText(scope, marginX + 460, y + 29);
    ctx.textAlign = 'right';
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText(price, width - marginX - 20, y + 29);
    ctx.textAlign = 'left';
    y += 48;
  });

  // Fiyat Özeti & Koşullar
  y += 24;
  drawSummaryAndRulesBlock(ctx, marginX, width, y, quote, validUntilStr);

  // Dijital Onay & İmzalar
  y += 304;
  drawDigitalApprovalBanner(ctx, marginX, contentW, y, quote.digitalApprovalToken);

  y += 98;
  drawSignaturePair(ctx, marginX, contentW, y, 168, clubName, owner, contact);

  drawPageFooter(ctx, width, height, clubName, dateStr);
  return [p1];
}

// ---------------------------------------------------------------------------
// FORMAT 2: 2 SAYFA — YÖNETİCİ ÖZETİ (ÖNERİLEN)
// ---------------------------------------------------------------------------
function buildTwoPageProposal(params: {
  logo: HTMLImageElement | null;
  quote: Quote;
  request?: QuoteRequest;
  club?: Club;
  contact?: Contact;
  owner?: User;
  pkg?: ProductPackage;
  tier?: AthleteTier;
  modules: ProductModule[];
  clubName: string;
  dateStr: string;
  validUntilStr: string;
}): PageCanvas[] {
  const {
    logo,
    quote,
    request,
    club,
    contact,
    owner,
    pkg,
    tier,
    modules,
    clubName,
    dateStr,
    validUntilStr,
  } = params;
  const latest = quote.versions[quote.versions.length - 1];

  // ---------------- SAYFA 1: ÖZET, FAYDA VE KAPSAM ----------------
  const p1 = createA4Canvas();
  {
    const { ctx, width, height } = p1;
    const marginX = 80;
    const contentW = width - marginX * 2;

    drawPageHeader(ctx, width, logo, clubName, validUntilStr);

    let y = 142;
    const heroH = 212;
    fillRoundedRect(ctx, marginX, y, contentW, heroH, 14, BRAND_NAVY);
    ctx.fillStyle = BRAND_LIME;
    ctx.fillRect(marginX + 36, y + 28, 50, 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 32px ${FONT_SANS}`;
    ctx.fillText(clubName, marginX + 36, y + 78);

    ctx.fillStyle = BRAND_LIME;
    ctx.font = `700 20px ${FONT_SANS}`;
    ctx.fillText(quote.templateName, marginX + 36, y + 114);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `400 15px ${FONT_SANS}`;
    wrapLines(
      ctx,
      'Aidat takibini otomatikleştirin; yoklama, sporcu gelişim karnesi ve veli iletişimini tek uygulamada toplayın.',
      contentW - 72
    )
      .slice(0, 2)
      .forEach((line, i) => ctx.fillText(line, marginX + 36, y + 152 + i * 22));

    // Kulüp ve Talep Özeti (4 temiz satır)
    y += heroH + 34;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText('Kulüp ve Teklif Bilgileri', marginX, y);
    y += 14;
    fillRoundedRect(ctx, marginX, y, contentW, 152, 10, '#ffffff', BRAND_BORDER, 1.5);

    const rows: Array<[string, string]> = [
      ['Teklif Sunulan Kurum', `${clubName} (${club?.type ?? 'Spor Kulübü'} · ${club?.city ?? '—'})`],
      ['Branşlar ve Sporcu Ölçeği', `${club?.branches.join(', ') ?? '—'} · ${formatNumberTR(latest.athleteCount)} tahmini sporcu`],
      ['Kulüp Yetkilisi & Kapsam', `${contact?.fullName ?? '—'} (${contact?.roleTitle ?? 'Yetkili'}) · ${request?.title ?? pkg?.name ?? 'Sadece Ek Modüller'}`],
      ['Hazırlayan & Geçerlilik', `${owner?.name ?? 'SportsFly Ekibi'} · ${dateStr} — Son Geçerlilik: ${validUntilStr}`],
    ];
    let ry = y + 34;
    rows.forEach(([k, v], idx) => {
      if (idx > 0) {
        ctx.strokeStyle = BRAND_BORDER;
        ctx.beginPath();
        ctx.moveTo(marginX + 20, ry - 22);
        ctx.lineTo(width - marginX - 20, ry - 22);
        ctx.stroke();
      }
      ctx.fillStyle = BRAND_MUTED;
      ctx.font = `500 14px ${FONT_SANS}`;
      ctx.fillText(k, marginX + 22, ry);
      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 14px ${FONT_SANS}`;
      ctx.fillText(v, marginX + 260, ry);
      ry += 35;
    });

    // SportsFly ile Neler Değişir? (3 Kart)
    y += 184;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText('SportsFly ile Kulübünüzde Neler Değişir?', marginX, y);
    y += 18;

    const benW = (contentW - 32) / 3;
    const benH = 228;
    const benefits = [
      {
        tag: 'OTOMATİK AİDAT',
        title: 'Geciken Aidat Takibi Biter',
        desc: 'Velilere WhatsApp ve SMS ile tek tık ödeme linki gönderilir. Tahsilatlar otomatik işlenir, hatırlatmalar sistem tarafından yapılır.',
        lime: true,
      },
      {
        tag: 'SAHA & VELİ',
        title: 'Cepten Yoklama ve Karne',
        desc: 'Antrenörler sahadan saniyeler içinde yoklama alır. Devamlılık ve gelişim karneleri velilerin telefonuna düzenli iletilir.',
        lime: false,
      },
      {
        tag: 'HIZLI KURULUM',
        title: 'Ek Cihaz Gerektirmez',
        desc: 'Mevcut Excel üye listeniz 3 dakikada aktarılır. Turnike, kart okuyucu veya ek sunucu kurulumu olmadan aynı hafta yayına geçersiniz.',
        lime: true,
      },
    ];

    benefits.forEach((b, idx) => {
      const bx = marginX + idx * (benW + 16);
      fillRoundedRect(ctx, bx, y, benW, benH, 10, BRAND_SLATE_BG, BRAND_BORDER, 1.5);
      fillRoundedRect(ctx, bx + 18, y + 18, 134, 24, 5, b.lime ? BRAND_LIME : BRAND_NAVY);
      ctx.fillStyle = b.lime ? BRAND_NAVY : BRAND_LIME;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillText(b.tag, bx + 28, y + 34);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 16px ${FONT_SANS}`;
      ctx.fillText(b.title, bx + 18, y + 70);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 14px ${FONT_SANS}`;
      wrapLines(ctx, b.desc, benW - 36).forEach((line, li) => {
        ctx.fillText(line, bx + 18, y + 98 + li * 21);
      });
    });

    // Seçilen Paket Kapsamı ve Eklenen Akıllı Modüller
    y += benH + 34;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText(`Seçilen Kapsam: ${pkg?.name ?? 'Sadece Ek Modüller'}`, marginX, y);
    y += 18;

    let addonStartY = y;
    if (pkg) {
      const pkgFeatures = pkg.features ?? ['Temel kulüp yönetim ve tahsilat altyapısı'];
      const featRows = Math.ceil(pkgFeatures.length / 2);
      const pkgBoxH = 82 + featRows * 30;
      fillRoundedRect(ctx, marginX, y, contentW, pkgBoxH, 10, BRAND_SLATE_BG, BRAND_BORDER, 1.5);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 15px ${FONT_SANS}`;
      ctx.fillText(`${pkg.name} — Paket Kapsamındaki Özellikler`, marginX + 20, y + 30);

      fillRoundedRect(ctx, width - marginX - 130, y + 14, 110, 22, 5, BRAND_LIME);
      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 10px ${FONT_SANS}`;
      ctx.fillText('PAKETE DAHİL', width - marginX - 116, y + 29);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 13px ${FONT_SANS}`;
      ctx.fillText(
        pkg.description ?? 'Kulübünüz için seçilen paket kapsamında sunulan temel özellikler:',
        marginX + 20,
        y + 52
      );

      ctx.strokeStyle = BRAND_BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + 20, y + 66);
      ctx.lineTo(width - marginX - 20, y + 66);
      ctx.stroke();

      const featColW = (contentW - 60) / 2;
      pkgFeatures.forEach((feat, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const fx = marginX + 20 + col * (featColW + 20);
        const fy = y + 92 + row * 30;
        fillRoundedRect(ctx, fx, fy - 11, 14, 14, 4, BRAND_BLUE);
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 10px ${FONT_SANS}`;
        ctx.fillText('✓', fx + 3, fy);

        ctx.fillStyle = BRAND_NAVY;
        ctx.font = `600 13px ${FONT_SANS}`;
        ctx.fillText(feat, fx + 22, fy);
      });
      addonStartY = y + pkgBoxH + 22;
    }

    const addonKeys = latest.selectedModules
      .filter((key) => !pkg?.includedModules.includes(key))
      .slice(0, 6);
    if (addonKeys.length > 0) {
      y = addonStartY;
      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 15px ${FONT_SANS}`;
      ctx.fillText(`Eklenen Akıllı Modüller (${addonKeys.length})`, marginX, y);
      y += 14;

      const modCardW = (contentW - 20) / 2;
      const modCardH = 80;
      addonKeys.forEach((key, idx) => {
        const mod = modules.find((m) => m.key === key);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const mx = marginX + col * (modCardW + 20);
        const my = y + row * (modCardH + 12);

        fillRoundedRect(ctx, mx, my, modCardW, modCardH, 10, '#ffffff', BRAND_BORDER, 1.5);
        fillRoundedRect(ctx, mx + 16, my + 14, 86, 20, 5, BRAND_NAVY);
        ctx.fillStyle = BRAND_LIME;
        ctx.font = `700 10px ${FONT_SANS}`;
        ctx.fillText('EK MODÜL', mx + 25, my + 28);

        let title = mod?.name ?? key;
        if (key === 'SportsFlyLab') {
          title = `${title} (${formatNumberTR(latest.labAthleteCount ?? latest.athleteCount)} sporcu)`;
        } else if (key === 'TurnuvaFikstur' && latest.tournamentMode === 'single') {
          title = `${title} (Tek Turnuva)`;
        }

        ctx.fillStyle = BRAND_NAVY;
        ctx.font = `700 14px ${FONT_SANS}`;
        ctx.fillText(title, mx + 112, my + 29);

        ctx.fillStyle = BRAND_BODY;
        ctx.font = `400 12px ${FONT_SANS}`;
        const desc = mod?.description ?? 'Kulüp operasyonlarını kolaylaştıran aktif SportsFly modülü.';
        wrapLines(ctx, desc, modCardW - 32)
          .slice(0, 2)
          .forEach((l, li) => ctx.fillText(l, mx + 16, my + 52 + li * 16));
      });
    }

    drawPageFooter(ctx, width, height, clubName, dateStr);
  }

  // ---------------- SAYFA 2: FİYAT ÖZETİ, BAŞLANGIÇ PLANI VE ONAY ----------------
  const p2 = createA4Canvas();
  {
    const { ctx, width, height } = p2;
    const marginX = 80;
    const contentW = width - marginX * 2;

    drawPageHeader(ctx, width, logo, clubName, validUntilStr);

    const isYearly = latest.billingCycle === 'yillik';
    let y = 166;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 26px ${FONT_SANS}`;
    ctx.fillText('Fiyat Özeti, Başlangıç Planı ve Onay', marginX, y);
    y += 28;
    ctx.fillStyle = BRAND_BODY;
    ctx.font = `500 15px ${FONT_SANS}`;
    ctx.fillText(
      `Kapsam: ${pkg?.name ?? 'Sadece Ek Modüller'}   ·   Plan: ${isYearly ? 'Yıllık Peşin (%20 İndirim)' : 'Aylık Ödeme'}   ·   ${tier?.label ?? '—'} (${formatNumberTR(latest.athleteCount)} sporcu)`,
      marginX,
      y
    );

    // Sade Fiyat Tablosu
    y += 32;
    fillRoundedRect(ctx, marginX, y, contentW, 46, 8, BRAND_NAVY);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText('Hizmet / Modül Kalemi', marginX + 20, y + 29);
    ctx.fillText('Kapsam', marginX + 490, y + 29);
    ctx.textAlign = 'right';
    ctx.fillStyle = BRAND_LIME;
    ctx.fillText(
      isYearly ? 'Yıllık Peşin (KDV Hariç)' : 'Aylık Tutar (KDV Hariç)',
      width - marginX - 20,
      y + 29
    );
    ctx.textAlign = 'left';
    y += 46;

    const includedList = latest.selectedModules
      .filter((k) => pkg?.includedModules.includes(k))
      .map((k) => modules.find((m) => m.key === k)?.name ?? k);
    const addonList = latest.selectedModules
      .filter((k) => !pkg?.includedModules.includes(k))
      .map((k) => {
        const base = modules.find((m) => m.key === k)?.name ?? k;
        if (k === 'SportsFlyLab') {
          return `${base} (${formatNumberTR(latest.labAthleteCount ?? latest.athleteCount)} sporcu · ${
            latest.labMode === 'analiz' ? 'Analiz' : 'Karne'
          })`;
        }
        if (k === 'TurnuvaFikstur' && latest.tournamentMode === 'single') {
          return `${base} (Tek Turnuva 5.000 ₺)`;
        }
        return base;
      });

    const priceRows: Array<[string, string, string]> = pkg
      ? [
          [pkg.name, 'Temel kulüp yönetim ve tahsilat altyapısı', formatTRY(latest.packageBaseAmount)],
          [
            `Sporcu Kapasite Kademesi (${tier?.label ?? 'Standart'})`,
            `${formatNumberTR(latest.athleteCount)} aktif sporcu kapasitesi`,
            `+${formatTRY(latest.tierAdjustmentAmount)}`,
          ],
          [
            'Paket Kapsamındaki Özellikler',
            pkg.features.slice(0, 3).join(' · ') || includedList.join(', ') || 'Temel modüller',
            'Dahil',
          ],
        ]
      : [
          [
            'Ana Paket Durumu',
            `Paket seçilmedi (Modül bazlı teklif · ${formatNumberTR(latest.athleteCount)} sporcu)`,
            '—',
          ],
        ];

    if (addonList.length > 0 || latest.addonModulesAmount > 0) {
      priceRows.push([
        `Ek Modüller (${addonList.length})`,
        addonList.join(', ') || 'Ek modül paketi',
        `+${formatTRY(latest.addonModulesAmount)}`,
      ]);
    }

    priceRows.forEach(([title, scope, price], idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : BRAND_SLATE_BG;
      ctx.fillRect(marginX, y, contentW, 54);
      ctx.strokeStyle = BRAND_BORDER;
      ctx.strokeRect(marginX, y, contentW, 54);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 14px ${FONT_SANS}`;
      ctx.fillText(title, marginX + 20, y + 32);

      ctx.fillStyle = BRAND_MUTED;
      ctx.font = `400 13px ${FONT_SANS}`;
      const shortScope = scope.length > 52 ? `${scope.slice(0, 50)}...` : scope;
      ctx.fillText(shortScope, marginX + 490, y + 32);

      ctx.textAlign = 'right';
      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 15px ${FONT_SANS}`;
      ctx.fillText(price, width - marginX - 20, y + 32);
      ctx.textAlign = 'left';
      y += 54;
    });

    // Özet ve Koşullar
    y += 30;
    drawSummaryAndRulesBlock(ctx, marginX, width, y, quote, validUntilStr);

    // 3 Adımda Başlangıç Planı
    y += 312;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText('3 Adımda Hızlı Başlangıç', marginX, y);
    y += 18;

    const stepW = (contentW - 32) / 3;
    const stepH = 134;
    const threeSteps = [
      ['1. ADIM · 1. GÜN', 'Liste Aktarımı', 'Mevcut Excel sporcu ve grup listenizi 3 dakikada sisteme aktarırız.'],
      ['2. ADIM · 2-3. GÜN', 'Ödeme & Panel Ayarı', 'Online tahsilat linkleri ve kulüp yönetim/veli panelleri açılır.'],
      ['3. ADIM · 4-5. GÜN', 'Kısa Eğitim & Yayın', 'Antrenör ve yöneticilere 45 dk eğitim verilir; velilere açılır.'],
    ];
    threeSteps.forEach(([badge, stTitle, stDesc], idx) => {
      const sx = marginX + idx * (stepW + 16);
      fillRoundedRect(ctx, sx, y, stepW, stepH, 10, BRAND_SLATE_BG, BRAND_BORDER, 1.5);
      fillRoundedRect(ctx, sx + 16, y + 16, 136, 22, 5, BRAND_NAVY);
      ctx.fillStyle = BRAND_LIME;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillText(badge, sx + 24, y + 31);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 15px ${FONT_SANS}`;
      ctx.fillText(stTitle, sx + 16, y + 64);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 13px ${FONT_SANS}`;
      wrapLines(ctx, stDesc, stepW - 32).forEach((l, li) => {
        ctx.fillText(l, sx + 16, y + 88 + li * 19);
      });
    });

    // Dijital Onay + İmzalar
    y += stepH + 34;
    drawDigitalApprovalBanner(ctx, marginX, contentW, y, quote.digitalApprovalToken);

    y += 106;
    drawSignaturePair(ctx, marginX, contentW, y, 184, clubName, owner, contact);

    drawPageFooter(ctx, width, height, clubName, dateStr);
  }

  return [p1, p2];
}

// ---------------------------------------------------------------------------
// FORMAT 3: 3 SAYFA — SADELEŞTİRİLMİŞ KURUMSAL TEKLİF
// ---------------------------------------------------------------------------
function buildThreePageProposal(params: {
  logo: HTMLImageElement | null;
  quote: Quote;
  request?: QuoteRequest;
  club?: Club;
  contact?: Contact;
  owner?: User;
  pkg?: ProductPackage;
  tier?: AthleteTier;
  modules: ProductModule[];
  clubName: string;
  dateStr: string;
  validUntilStr: string;
}): PageCanvas[] {
  const {
    logo,
    quote,
    request,
    club,
    contact,
    owner,
    pkg,
    tier,
    modules,
    clubName,
    dateStr,
    validUntilStr,
  } = params;
  const latest = quote.versions[quote.versions.length - 1];

  // ---------------- SAYFA 1: KURUMSAL KAPAK, MARKA AVANTAJLARI & TARAFLAR ----------------
  const p1 = createA4Canvas();
  {
    const { ctx, width, height } = p1;
    const marginX = 80;
    const contentW = width - marginX * 2;

    drawPageHeader(ctx, width, logo, clubName, validUntilStr);

    let y = 142;
    const heroH = 232;
    fillRoundedRect(ctx, marginX, y, contentW, heroH, 14, BRAND_NAVY);
    ctx.fillStyle = BRAND_LIME;
    ctx.fillRect(marginX + 36, y + 30, 52, 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 34px ${FONT_SANS}`;
    const clubTitleLines = wrapLines(ctx, clubName, contentW - 72).slice(0, 2);
    let hy = y + 84;
    clubTitleLines.forEach((line) => {
      ctx.fillText(line, marginX + 36, hy);
      hy += 42;
    });

    ctx.fillStyle = BRAND_LIME;
    ctx.font = `700 22px ${FONT_SANS}`;
    ctx.fillText(quote.templateName, marginX + 36, hy + 4);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `400 15px ${FONT_SANS}`;
    wrapLines(
      ctx,
      'Aidat takibini otomatikleştirin; Sporpuan ve Dijital Sporcu Karnesi ile sporcu devamlılığını ve kulüp bağlılığını artırın.',
      contentW - 72
    )
      .slice(0, 2)
      .forEach((line, i) => ctx.fillText(line, marginX + 36, y + heroH - 52 + i * 22));

    // 4 Sade Avantaj Kartı
    y = y + heroH + 42;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 20px ${FONT_SANS}`;
    ctx.fillText('Temel Avantajlar ve Kulübünüze Katkısı', marginX, y);
    y += 20;

    const boxW = (contentW - 22) / 2;
    const boxH = 140;
    const highlights = [
      {
        tag: 'TAHSİLAT GÜCÜ',
        title: '%98 Otomatik Aidat Tahsilatı',
        desc: 'Velilere WhatsApp ve SMS üzerinden akıllı ödeme linki gönderilir; geciken ödemeler ve manuel takip ortadan kalkar.',
        accent: BRAND_LIME,
      },
      {
        tag: 'HIZLI BAŞLANGIÇ',
        title: '3 Dakikada Kurulum, Ek Cihaz Yok',
        desc: 'Mevcut Excel üye ve grup listeniz dakikalar içinde aktarılır; turnike, kart okuyucu veya ek sunucu maliyeti gerekmez.',
        accent: BRAND_NAVY,
      },
      {
        tag: 'SADAKAT & GELİŞİM',
        title: 'Sporpuan ve Dijital Karne',
        desc: 'Antrenman devamlılığını ödüllendiren puan sistemi ve gelişim karneleri ile sporcu kayıt yenileme oranı artar.',
        accent: BRAND_NAVY,
      },
      {
        tag: 'HER YERDEN ERİŞİM',
        title: 'Yönetici, Antrenör ve Veli Panelleri',
        desc: 'Her rol kendi ekranını kullanır: antrenör sahadan yoklama alır, yönetici tahsilatı izler, veli karneleri görür.',
        accent: BRAND_LIME,
      },
    ];

    highlights.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = marginX + col * (boxW + 22);
      const by = y + row * (boxH + 18);

      fillRoundedRect(ctx, bx, by, boxW, boxH, 10, '#ffffff', BRAND_BORDER, 1.5);
      fillRoundedRect(
        ctx,
        bx + 18,
        by + 16,
        140,
        22,
        5,
        item.accent === BRAND_LIME ? BRAND_LIME : BRAND_NAVY
      );
      ctx.fillStyle = item.accent === BRAND_LIME ? BRAND_NAVY : BRAND_LIME;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillText(item.tag, bx + 26, by + 31);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 17px ${FONT_SANS}`;
      ctx.fillText(item.title, bx + 18, by + 62);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 14px ${FONT_SANS}`;
      wrapLines(ctx, item.desc, boxW - 36).forEach((l, li) => {
        ctx.fillText(l, bx + 18, by + 86 + li * 20);
      });
    });

    y += boxH * 2 + 52;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 19px ${FONT_SANS}`;
    ctx.fillText('Teklif Tarafları ve Talep Bilgileri', marginX, y);
    y += 12;
    ctx.strokeStyle = BRAND_NAVY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, y);
    ctx.lineTo(marginX + 260, y);
    ctx.stroke();
    ctx.strokeStyle = BRAND_LIME;
    ctx.beginPath();
    ctx.moveTo(marginX + 260, y);
    ctx.lineTo(marginX + 340, y);
    ctx.stroke();
    y += 28;

    const infoRows: Array<[string, string]> = [
      ['Teklif Sunulan Kurum', `${clubName} (${club?.type ?? 'Spor Kulübü'} · ${club?.city ?? '—'})`],
      ['Branşlar ve Ölçek', `${club?.branches.join(', ') ?? '—'} · ${formatNumberTR(latest.athleteCount)} tahmini sporcu`],
      ['Kulüp Yetkilisi', `${contact?.fullName ?? '—'} (${contact?.roleTitle ?? 'Yetkili'}) · ${contact?.email ?? ''}`],
      ['Teklif Kapsamı', request?.title ?? pkg?.name ?? 'Sadece Ek Modüller'],
      ['Teklif Düzenleyen', `${owner?.name ?? 'SportsFly Satış Ekibi'} (${owner?.title ?? 'Satış Temsilcisi'})`],
      ['Düzenleme / Geçerlilik', `${dateStr} — Son Geçerlilik: ${validUntilStr} (${quote.validityDays} gün)`],
    ];

    infoRows.forEach(([label, val]) => {
      ctx.fillStyle = BRAND_MUTED;
      ctx.font = `500 15px ${FONT_SANS}`;
      ctx.fillText(label, marginX, y);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 15px ${FONT_SANS}`;
      const vLines = wrapLines(ctx, val, contentW - 250);
      vLines.forEach((l, i) => ctx.fillText(l, marginX + 250, y + i * 22));
      y += Math.max(34, vLines.length * 22 + 12);
    });

    y += 14;
    const kpiW = (contentW - 24) / 3;
    const kpis = [
      { metric: '%98', label: 'Otomatik Aidat Tahsilat Oranı' },
      { metric: '3 Dakika', label: 'Excel Üye Listesi ile Kurulum' },
      { metric: '5 Gün', label: 'Uçtan Uca Canlıya Geçiş' },
    ];
    kpis.forEach((k, idx) => {
      const kx = marginX + idx * (kpiW + 12);
      fillRoundedRect(ctx, kx, y, kpiW, 82, 10, BRAND_NAVY);
      ctx.fillStyle = BRAND_LIME;
      ctx.font = `700 24px ${FONT_SANS}`;
      ctx.fillText(k.metric, kx + 20, y + 38);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `500 13px ${FONT_SANS}`;
      ctx.fillText(k.label, kx + 20, y + 63);
    });

    drawPageFooter(ctx, width, height, clubName, dateStr);
  }

  // ---------------- SAYFA 2: PAKET KARŞILAŞTIRMASI VE AKILLI MODÜLLER ----------------
  const p2 = createA4Canvas();
  {
    const { ctx, width, height } = p2;
    const marginX = 80;
    const contentW = width - marginX * 2;

    drawPageHeader(ctx, width, logo, clubName, validUntilStr);

    let y = 166;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 26px ${FONT_SANS}`;
    ctx.fillText('SportsFly Paketleri ve ', marginX, y);
    const p1w = ctx.measureText('SportsFly Paketleri ve ').width;
    ctx.fillStyle = BRAND_BLUE;
    ctx.fillText('Öne Çıkan Özellikler', marginX + p1w, y);

    y += 28;
    ctx.fillStyle = BRAND_MUTED;
    ctx.font = `400 15px ${FONT_SANS}`;
    ctx.fillText(
      'Kulübünüzün büyüklüğüne göre ölçeklenen lisans seçenekleri ve günlük operasyonu kolaylaştıran modüller.',
      marginX,
      y
    );

    // 1. Öne Çıkan Modüller (Sade dil, jargon yok)
    y += 38;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 17px ${FONT_SANS}`;
    ctx.fillText('1. Kulübünüz İçin Öne Çıkan Modüller', marginX, y);
    y += 16;

    const ecoTop = [
      {
        badge: 'PERFORMANS',
        title: 'SportsFly Lab',
        desc: 'Sporcuların boy, kilo, esneklik ve hız ölçümlerini kaydeder; dönemlik gelişim grafiklerini otomatik çıkarır.',
      },
      {
        badge: 'VELİ & SADAKAT',
        title: 'Sporpuan & Dijital Karne',
        desc: 'Devamlılık ve gelişim puanlaması sunar. Hazırlanan dijital karneler velilere otomatik WhatsApp üzerinden iletilir.',
      },
      {
        badge: 'ORGANİZASYON',
        title: 'Turnuva & Fikstür Yönetimi',
        desc: 'Lig ve kupa takvimi oluşturma, anlık maç skoru girişi ve otomatik güncellenen puan durumu cetveli.',
      },
    ];

    const topCardW = (contentW - 32) / 3;
    const topCardH = 150;
    ecoTop.forEach((mod, idx) => {
      const mx = marginX + idx * (topCardW + 16);
      fillRoundedRect(ctx, mx, y, topCardW, topCardH, 10, BRAND_SLATE_BG, BRAND_BORDER, 1.5);
      fillRoundedRect(ctx, mx + 16, y + 16, 114, 22, 5, BRAND_NAVY);
      ctx.fillStyle = BRAND_LIME;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillText(mod.badge, mx + 24, y + 31);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 16px ${FONT_SANS}`;
      ctx.fillText(mod.title, mx + 16, y + 62);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 13px ${FONT_SANS}`;
      wrapLines(ctx, mod.desc, topCardW - 32).forEach((line, li) => {
        ctx.fillText(line, mx + 16, y + 86 + li * 19);
      });
    });

    y += topCardH + 16;
    const ecoBottom = [
      {
        badge: 'DİJİTAL VİTRİN',
        title: 'Kulüp Web Sitesi Portalı',
        desc: '[kulup].sportsfly.com.tr adresli kulüp web siteniz; branşlar, antrenör kadrosu ve online ön kayıt formuyla hazır açılır.',
      },
      {
        badge: 'BÜYÜME ASİSTANI',
        title: 'Kayıt Yenileme Takibi',
        desc: 'Dönem bitiminde yenilemeleri öngörür, devamsızlığı artan sporcuları erken fark edip kayıt kaybını önlemeye yardımcı olur.',
      },
    ];

    const botCardW = (contentW - 18) / 2;
    const botCardH = 122;
    ecoBottom.forEach((mod, idx) => {
      const mx = marginX + idx * (botCardW + 18);
      fillRoundedRect(ctx, mx, y, botCardW, botCardH, 10, BRAND_SLATE_BG, BRAND_BORDER, 1.5);
      fillRoundedRect(ctx, mx + 18, y + 16, 134, 22, 5, BRAND_LIME);
      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillText(mod.badge, mx + 26, y + 31);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 16px ${FONT_SANS}`;
      ctx.fillText(mod.title, mx + 18, y + 62);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 13px ${FONT_SANS}`;
      wrapLines(ctx, mod.desc, botCardW - 36).forEach((line, li) => {
        ctx.fillText(line, mx + 18, y + 86 + li * 19);
      });
    });

    // 2. Paket Kademeleri
    y += botCardH + 34;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 17px ${FONT_SANS}`;
    ctx.fillText('2. SportsFly Lisans Paketleri (Yıllık Planlarda %20 İndirim Avantajı)', marginX, y);
    y += 16;

    const plans = [
      {
        badge: 'TEK ŞUBE & BUTİK OKUL',
        name: 'Başlangıç Kulübü',
        monthlyPrice: '2.199 ₺ / ay',
        annualPrice: 'Yıllık: 1.759 ₺/ay · Peşin: 21.108 ₺',
        featured: false,
        features: [
          '100 Aktif Sporcuya Kadar',
          'Mobil Uyumlu Hızlı Yoklama',
          'Temel Veli Bildirimleri (SMS & Mail)',
          'Standart Sporpuan Altyapısı',
          '2 Antrenör & 1 Yönetici Hesabı',
        ],
      },
      {
        badge: 'EN ÇOK TERCİH EDİLEN',
        name: 'Kulüp & Akademi',
        monthlyPrice: '3.699 ₺ / ay',
        annualPrice: 'Yıllık: 2.959 ₺/ay · Peşin: 35.508 ₺',
        featured: true,
        features: [
          '350 Aktif Sporcuya Kadar',
          'Gelişmiş Sporpuan & Ödül Kataloğu',
          '100 Sporcuya Kadar Dijital Karne',
          'Otomatik WhatsApp Karne Gönderimi',
          'Gelişim Grafikleri & Aidat Takibi',
          'Sınırsız Antrenör & 7/24 Destek',
        ],
      },
      {
        badge: 'ÇOKLU ŞUBE & BÜYÜK KULÜP',
        name: 'Pro Akademi & Çoklu Şube',
        monthlyPrice: 'Kurumsal Teklif',
        annualPrice: 'Kulübünüze Özel Kapsam & Fiyat',
        featured: false,
        features: [
          'Sınırsız Sporcu & Sınırsız Şube',
          'Kulübe Özel Alan Adı ve Web Portalı',
          'Sanal POS ile Online Kart Tahsilatı',
          'Kulübe Özel Mobil Uygulama (iOS/Android)',
          'Gelişmiş Finans, Kasa & Muhasebe',
          'Özel Müşteri Başarı Yöneticisi',
        ],
      },
    ];

    const planW = (contentW - 32) / 3;
    const planH = 392;
    plans.forEach((plan, idx) => {
      const px = marginX + idx * (planW + 16);
      if (plan.featured) {
        fillRoundedRect(ctx, px, y, planW, planH, 12, BRAND_NAVY, BRAND_LIME, 2.5);
      } else {
        fillRoundedRect(ctx, px, y, planW, planH, 12, '#ffffff', BRAND_BORDER, 1.5);
      }

      fillRoundedRect(
        ctx,
        px + 18,
        y + 18,
        planW - 36,
        24,
        6,
        plan.featured ? BRAND_LIME : BRAND_SLATE_BG
      );
      ctx.fillStyle = plan.featured ? BRAND_NAVY : BRAND_BLUE;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillText(plan.badge, px + 26, y + 34);

      ctx.fillStyle = plan.featured ? '#ffffff' : BRAND_NAVY;
      ctx.font = `700 18px ${FONT_SANS}`;
      ctx.fillText(plan.name, px + 18, y + 72);

      ctx.fillStyle = plan.featured ? BRAND_LIME : BRAND_NAVY;
      ctx.font = `700 24px ${FONT_SANS}`;
      ctx.fillText(plan.monthlyPrice, px + 18, y + 108);

      ctx.fillStyle = plan.featured ? '#cbd5e1' : BRAND_BLUE;
      ctx.font = `600 13px ${FONT_SANS}`;
      ctx.fillText(plan.annualPrice, px + 18, y + 132);

      ctx.strokeStyle = plan.featured ? '#253559' : BRAND_BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 18, y + 150);
      ctx.lineTo(px + planW - 18, y + 150);
      ctx.stroke();

      let fy = y + 178;
      plan.features.forEach((feat) => {
        ctx.fillStyle = plan.featured ? BRAND_LIME : BRAND_BLUE;
        ctx.beginPath();
        ctx.arc(px + 24, fy - 4, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = plan.featured ? '#e2e8f0' : BRAND_BODY;
        ctx.font = `500 13px ${FONT_SANS}`;
        ctx.fillText(feat, px + 36, fy);
        fy += 32;
      });
    });

    // 3. Geleneksel vs SportsFly (4 net satır)
    y += planH + 32;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 17px ${FONT_SANS}`;
    ctx.fillText('3. Geleneksel Takip Yöntemleri vs. SportsFly', marginX, y);
    y += 14;

    const col1 = marginX;
    const col2 = marginX + 290;
    const col3 = marginX + 670;

    fillRoundedRect(ctx, marginX, y, contentW, 42, 8, BRAND_NAVY);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText('Operasyon Alanı', col1 + 16, y + 26);
    ctx.fillText('Excel & WhatsApp ile Takip', col2 + 16, y + 26);
    ctx.fillStyle = BRAND_LIME;
    ctx.fillText('SportsFly Platformu', col3 + 16, y + 26);
    y += 42;

    const compareRows = [
      ['Aidat Tahsilatı', 'Manuel hatırlatma, geciken ödemeler', 'WhatsApp/SMS ödeme linki, %98 tahsilat'],
      ['Antrenman Yoklaması', 'Kağıt listeler ve kaybolan formlar', 'Telefonla sahadan anlık yoklama'],
      ['Veli İletişimi', 'Dağınık grup mesajları', 'Veli paneli ve otomatik dijital karne'],
      ['Kurulum & Güvenlik', 'Dağınık dosyalar, haftalarca hazırlık', '3 dakikada Excel aktarımı, KVKK uyumlu'],
    ];

    compareRows.forEach((row, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : BRAND_SLATE_BG;
      ctx.fillRect(marginX, y, contentW, 44);
      ctx.strokeStyle = BRAND_BORDER;
      ctx.strokeRect(marginX, y, contentW, 44);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 14px ${FONT_SANS}`;
      ctx.fillText(row[0], col1 + 16, y + 27);

      ctx.fillStyle = BRAND_MUTED;
      ctx.font = `400 13px ${FONT_SANS}`;
      ctx.fillText(row[1], col2 + 16, y + 27);

      ctx.fillStyle = BRAND_BLUE;
      ctx.font = `600 13px ${FONT_SANS}`;
      ctx.fillText(row[2], col3 + 16, y + 27);
      y += 44;
    });

    drawPageFooter(ctx, width, height, clubName, dateStr);
  }

  // ---------------- SAYFA 3: FİYATLANDIRMA, 5 GÜNLÜK GEÇİŞ PLANI VE ONAY ----------------
  const p3 = createA4Canvas();
  {
    const { ctx, width, height } = p3;
    const marginX = 80;
    const contentW = width - marginX * 2;

    drawPageHeader(ctx, width, logo, clubName, validUntilStr);

    const isYearly = latest.billingCycle === 'yillik';
    let y = 164;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 26px ${FONT_SANS}`;
    ctx.fillText('Seçilen Kapsam, Fiyatlandırma ve Onay', marginX, y);
    y += 28;
    ctx.fillStyle = BRAND_BODY;
    ctx.font = `500 15px ${FONT_SANS}`;
    ctx.fillText(
      `Kapsam: ${pkg?.name ?? 'Sadece Ek Modüller'}   ·   Plan: ${isYearly ? 'Yıllık Peşin (%20 İndirim)' : 'Aylık Ödeme'}   ·   ${tier?.label ?? '—'} (${formatNumberTR(latest.athleteCount)} sporcu)`,
      marginX,
      y
    );

    // Fiyat Tablosu
    y += 28;
    fillRoundedRect(ctx, marginX, y, contentW, 44, 8, BRAND_NAVY);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillText('Hizmet / Modül Kalemi', marginX + 20, y + 27);
    ctx.fillText('Kapsam', marginX + 490, y + 27);
    ctx.textAlign = 'right';
    ctx.fillStyle = BRAND_LIME;
    ctx.fillText(
      isYearly ? 'Yıllık Peşin (KDV Hariç)' : 'Aylık Tutar (KDV Hariç)',
      width - marginX - 20,
      y + 27
    );
    ctx.textAlign = 'left';
    y += 44;

    const includedList = latest.selectedModules
      .filter((k) => pkg?.includedModules.includes(k))
      .map((k) => modules.find((m) => m.key === k)?.name ?? k);
    const addonList = latest.selectedModules
      .filter((k) => !pkg?.includedModules.includes(k))
      .map((k) => {
        const base = modules.find((m) => m.key === k)?.name ?? k;
        if (k === 'SportsFlyLab') {
          return `${base} (${formatNumberTR(latest.labAthleteCount ?? latest.athleteCount)} sporcu · ${
            latest.labMode === 'analiz' ? 'Analiz' : 'Karne'
          })`;
        }
        if (k === 'TurnuvaFikstur' && latest.tournamentMode === 'single') {
          return `${base} (Tek Turnuva 5.000 ₺)`;
        }
        return base;
      });

    const lineItems: Array<[string, string, string]> = pkg
      ? [
          [pkg.name, 'Temel kulüp yönetim altyapısı', formatTRY(latest.packageBaseAmount)],
          [
            `Sporcu Kapasite Kademesi (${tier?.label ?? 'Standart'})`,
            `${formatNumberTR(latest.athleteCount)} sporcu ölçeği`,
            `+${formatTRY(latest.tierAdjustmentAmount)}`,
          ],
          [
            'Paket Kapsamındaki Özellikler',
            pkg.features.slice(0, 3).join(' · ') || includedList.join(', ') || 'Temel modüller',
            'Dahil',
          ],
        ]
      : [
          [
            'Ana Paket Durumu',
            `Paket seçilmedi (Modül bazlı teklif · ${formatNumberTR(latest.athleteCount)} sporcu)`,
            '—',
          ],
        ];
    if (addonList.length > 0 || latest.addonModulesAmount > 0) {
      lineItems.push([
        `Ek Modüller (${addonList.length})`,
        addonList.join(', ') || 'Ek modüller',
        `+${formatTRY(latest.addonModulesAmount)}`,
      ]);
    }

    lineItems.forEach(([title, scope, price], idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : BRAND_SLATE_BG;
      ctx.fillRect(marginX, y, contentW, 48);
      ctx.strokeStyle = BRAND_BORDER;
      ctx.strokeRect(marginX, y, contentW, 48);

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 14px ${FONT_SANS}`;
      ctx.fillText(title, marginX + 20, y + 29);

      ctx.fillStyle = BRAND_MUTED;
      ctx.font = `400 13px ${FONT_SANS}`;
      const shortScope = scope.length > 52 ? `${scope.slice(0, 50)}...` : scope;
      ctx.fillText(shortScope, marginX + 490, y + 29);

      ctx.textAlign = 'right';
      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `600 14px ${FONT_SANS}`;
      ctx.fillText(price, width - marginX - 20, y + 29);
      ctx.textAlign = 'left';
      y += 48;
    });

    y += 24;
    drawSummaryAndRulesBlock(ctx, marginX, width, y, quote, validUntilStr);

    // 5 Günde Canlıya Geçiş (2x2 kompakt ızgara)
    y += 306;
    ctx.fillStyle = BRAND_NAVY;
    ctx.font = `700 18px ${FONT_SANS}`;
    ctx.fillText('5 Günde Canlıya Geçiş Takvimi', marginX, y);
    y += 16;

    const steps = [
      ['1. GÜN', 'Veri Aktarımı & Kurulum', 'Mevcut Excel sporcu ve grup listeniz 3 dakikada aktarılır; şubeleriniz tanımlanır.'],
      ['2–3. GÜN', 'Ödeme & Veli Portalı', 'PayTR sanal POS, WhatsApp/SMS ödeme linkleri ve kulüp web portalı hazırlanır.'],
      ['4. GÜN', 'Kısa Ekip Eğitimi', 'Yöneticilere ve antrenörlere 45 dakikalık uygulamalı panel ve yoklama eğitimi verilir.'],
      ['5. GÜN', 'Canlı Yayın', 'Velilere dijital giriş bağlantısı gönderilir; aidat, yoklama ve karne akışı başlar.'],
    ];
    const stW = (contentW - 20) / 2;
    const stH = 98;
    steps.forEach(([badge, stTitle, stDesc], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const sx = marginX + col * (stW + 20);
      const sy = y + row * (stH + 14);
      fillRoundedRect(ctx, sx, sy, stW, stH, 10, BRAND_SLATE_BG, BRAND_BORDER, 1.5);
      fillRoundedRect(ctx, sx + 14, sy + 14, 78, 24, 6, BRAND_NAVY);
      ctx.fillStyle = BRAND_LIME;
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(badge, sx + 53, sy + 30);
      ctx.textAlign = 'left';

      ctx.fillStyle = BRAND_NAVY;
      ctx.font = `700 15px ${FONT_SANS}`;
      ctx.fillText(stTitle, sx + 104, sy + 31);

      ctx.fillStyle = BRAND_BODY;
      ctx.font = `400 13px ${FONT_SANS}`;
      wrapLines(ctx, stDesc, stW - 28)
        .slice(0, 2)
        .forEach((l, li) => ctx.fillText(l, sx + 14, sy + 58 + li * 18));
    });

    // Kısa Koşul & KVKK Notu
    y += stH * 2 + 38;
    ctx.fillStyle = BRAND_BODY;
    ctx.font = `400 13px ${FONT_SANS}`;
    const termsShort = `${latest.termsNote} Tüm iletişim ve kulüp kayıtları 6698 sayılı KVKK kapsamında açık rıza ve rol bazlı yetkilendirme ile güvenle saklanır.`;
    wrapLines(ctx, termsShort, contentW)
      .slice(0, 3)
      .forEach((l) => {
        ctx.fillText(l, marginX, y);
        y += 20;
      });

    // Dijital Onay + İmzalar
    y += 14;
    drawDigitalApprovalBanner(ctx, marginX, contentW, y, quote.digitalApprovalToken);

    y += 96;
    drawSignaturePair(ctx, marginX, contentW, y, 174, clubName, owner, contact);

    drawPageFooter(ctx, width, height, clubName, dateStr);
  }

  return [p1, p2, p3];
}

export async function generateProposalPdf(params: {
  quote: Quote;
  request?: QuoteRequest;
  club?: Club;
  contact?: Contact;
  owner?: User;
  pkg?: ProductPackage;
  tier?: AthleteTier;
  modules: ProductModule[];
  format?: ProposalFormat;
  triggerDownload?: boolean;
}): Promise<{ attachment: ClubAttachment; fileName: string; pageCount: number }> {
  const {
    quote,
    request,
    club,
    contact,
    owner,
    pkg,
    tier,
    modules,
    format = '2-sayfa',
    triggerDownload = true,
  } = params;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Sistem fallback fontları ile devam et
    }
  }

  const logo = await loadImage(SPORTSFLY_LOGO_URL);
  const latest = quote.versions[quote.versions.length - 1];
  const dateStr = formatDateTR(latest.createdAt);
  const validUntilStr = formatDateTR(quote.validUntil);
  const clubName = club?.name ?? 'Spor Kulübü';

  let pages: PageCanvas[];
  if (format === '1-sayfa') {
    pages = buildOnePageProposal({
      logo,
      quote,
      club,
      contact,
      owner,
      pkg,
      tier,
      modules,
      clubName,
      dateStr,
      validUntilStr,
    });
  } else if (format === '3-sayfa') {
    pages = buildThreePageProposal({
      logo,
      quote,
      request,
      club,
      contact,
      owner,
      pkg,
      tier,
      modules,
      clubName,
      dateStr,
      validUntilStr,
    });
  } else {
    pages = buildTwoPageProposal({
      logo,
      quote,
      request,
      club,
      contact,
      owner,
      pkg,
      tier,
      modules,
      clubName,
      dateStr,
      validUntilStr,
    });
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pages.forEach((page, idx) => {
    if (idx > 0) pdf.addPage();
    const img = page.canvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(img, 'JPEG', 0, 0, 210, 297);
  });

  const formatSlug = format === '1-sayfa' ? '1s' : format === '2-sayfa' ? '2s' : '3s';
  const fileName = `SportsFly_Teklif_${formatSlug}_${quote.quoteNumber}_${sanitizeSlug(clubName)}.pdf`;
  const dataUrl = pdf.output('datauristring');
  const approxKb = Math.max(95, Math.round((dataUrl.length * 0.75) / 1024));

  if (triggerDownload) {
    pdf.save(fileName);
  }

  const attachment: ClubAttachment = {
    id: `cf-proposal-${Date.now()}`,
    name: fileName,
    sizeLabel: `${approxKb} KB`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: owner?.name ?? 'SportsFly Sales&Marketing',
    dataUrl,
  };

  return { attachment, fileName, pageCount: pages.length };
}

export const generateFourPageProposalPdf = generateProposalPdf;
