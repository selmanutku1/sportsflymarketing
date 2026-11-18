import { jsPDF } from 'jspdf';
import type {
  Club,
  ClubAttachment,
  Contact,
  ProductModule,
  QuoteRequest,
  User,
} from '../types/crm';
import { formatDateTR, formatNumberTR, formatTRY } from './formatters';

function sanitizeFileSlug(text: string): string {
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
    .slice(0, 42);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
}

export interface GeneratedPdfResult {
  attachment: ClubAttachment;
  fileName: string;
  dataUrl: string;
}

export function generateQuoteRequestPdf(params: {
  request: QuoteRequest;
  club?: Club;
  contact?: Contact;
  owner?: User;
  modules: ProductModule[];
  createdByName: string;
  showPricing?: boolean;
  triggerDownload?: boolean;
}): GeneratedPdfResult {
  const {
    request,
    club,
    contact,
    owner,
    modules,
    createdByName,
    showPricing = true,
    triggerDownload = true,
  } = params;

  // A4 oranında yüksek çözünürlüklü tuval (1240 x 1754 px -> ~150 DPI)
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('PDF oluşturma tuvali başlatılamadı.');
  }

  // Arka plan
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const marginX = 88;
  const contentWidth = width - marginX * 2;
  let y = 76;

  // Kurumsal Üst Şerit (Midnight Navy + Electric Blue + Lime)
  ctx.fillStyle = '#091124';
  ctx.fillRect(0, 0, width, 154);
  ctx.fillStyle = '#0b5fff';
  ctx.fillRect(0, 154, width * 0.78, 10);
  ctx.fillStyle = '#b9f33d';
  ctx.fillRect(width * 0.78, 154, width * 0.22, 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Sports', marginX, 74);
  const sWidth = ctx.measureText('Sports').width;
  ctx.fillStyle = '#b9f33d';
  ctx.fillText('Fly', marginX + sWidth, 74);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 20px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Teklif Talebi Özet Belgesi · www.sportsfly.com.tr', marginX, 114);

  // Sağ üst belge referansları
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 20px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`Talep No: ${request.id.toUpperCase()}`, width - marginX, 74);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '400 18px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`Oluşturulma: ${formatDateTR(request.createdAt)}`, width - marginX, 110);
  ctx.textAlign = 'left';

  y = 224;

  // Talep Ana Başlığı
  ctx.fillStyle = '#091124';
  ctx.font = '700 28px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  const titleLines = wrapText(ctx, request.title, contentWidth);
  for (const line of titleLines) {
    ctx.fillText(line, marginX, y);
    y += 38;
  }

  ctx.fillStyle = '#475569';
  ctx.font = '500 18px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    `Aşama: ${request.stage}   ·   Öncelik: ${request.priority}   ·   Kaynak: ${request.source}`,
    marginX,
    y + 6
  );
  y += 44;

  const drawSectionHeader = (heading: string) => {
    ctx.fillStyle = '#0b5fff';
    ctx.font = '700 19px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(heading, marginX, y);
    y += 12;
    ctx.strokeStyle = '#e4e9f2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, y);
    ctx.lineTo(width - marginX, y);
    ctx.stroke();
    y += 30;
  };

  const drawKeyValueRow = (label: string, value: string) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 17px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(label, marginX, y);

    ctx.fillStyle = '#0f172a';
    ctx.font = '500 17px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    const valLines = wrapText(ctx, value, contentWidth - 290);
    valLines.forEach((line, idx) => {
      ctx.fillText(line, marginX + 290, y + idx * 25);
    });
    y += Math.max(34, valLines.length * 25 + 10);
  };

  // Bölüm 1: Kulüp Bilgileri
  drawSectionHeader('1. Kulüp ve Kurum Bilgileri');
  drawKeyValueRow('Kulüp / Kurum Adı', club?.name ?? '—');
  drawKeyValueRow('Kurum Türü ve Şehir', `${club?.type ?? '—'} · ${club?.city ?? '—'}`);
  drawKeyValueRow('Branşlar', club?.branches.join(', ') ?? '—');
  drawKeyValueRow('Tahmini Sporcu Sayısı', `${formatNumberTR(request.estimatedAthletes)} sporcu`);
  drawKeyValueRow('Mevcut SportsFly Durumu', club?.sportsflyStatus ?? '—');
  y += 18;

  // Bölüm 2: Yetkili Kişi & KVKK
  drawSectionHeader('2. Yetkili Kişi ve KVKK Uyumu');
  drawKeyValueRow('Yetkili Ad Soyad', contact?.fullName ?? '—');
  drawKeyValueRow('Görevi / Rolü', contact?.roleTitle ?? '—');
  drawKeyValueRow('E-posta / Telefon', `${contact?.email ?? '—'} · ${contact?.phone ?? '—'}`);
  drawKeyValueRow(
    'İletişim Tercihleri',
    contact?.communicationPrefs.join(', ') ?? '—'
  );
  drawKeyValueRow(
    'KVKK Açık Rıza Durumu',
    contact?.kvkkConsent
      ? `Onaylı (${formatDateTR(contact.kvkkConsentDate)})`
      : 'Açık Rıza Bekliyor'
  );
  y += 18;

  // Bölüm 3: Talep Detayları & Modüller
  drawSectionHeader('3. Talep Kapsamı ve İstenen Modüller');
  const moduleNames = request.requestedModules.map(
    (key) => modules.find((m) => m.key === key)?.name ?? key
  );
  drawKeyValueRow('İstenen Modüller', moduleNames.join(', '));
  drawKeyValueRow('Hedef Başlangıç Tarihi', formatDateTR(request.targetStartDate));
  drawKeyValueRow(
    'Bütçe Aralığı',
    showPricing ? request.budgetRange : 'Rol yetkisi gereği gizli'
  );
  drawKeyValueRow(
    'Tahmini Yıllık Değer',
    showPricing ? formatTRY(request.estimatedValue) : 'Rol yetkisi gereği gizli'
  );
  drawKeyValueRow('Sorumlu Temsilci', owner?.name ?? '—');
  drawKeyValueRow(
    'Planlanan Sonraki Adım',
    `${request.nextStep} (${formatDateTR(request.nextStepDate)})`
  );

  // Alt Bilgilendirme Kutusu (KVKK & İş Kuralları Notu)
  const footerBoxY = height - 220;
  ctx.fillStyle = '#f7f9fc';
  ctx.fillRect(marginX, footerBoxY, contentWidth, 108);
  ctx.strokeStyle = '#e4e9f2';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(marginX, footerBoxY, contentWidth, 108);

  ctx.fillStyle = '#091124';
  ctx.font = '600 16px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('KVKK ve Fiyatlandırma Politikası Notu', marginX + 20, footerBoxY + 32);

  ctx.fillStyle = '#475569';
  ctx.font = '400 15px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    '• Bu belgede hiçbir sporcu kişisel verisi yer almaz; yalnızca kulüp ve yetkili bilgileri işlenir.',
    marginX + 20,
    footerBoxY + 60
  );
  ctx.fillText(
    '• Oluşturulacak tekliflerde %20 KDV, 15 gün geçerlilik ve %20 üzeri indirimde Yönetici/Finans onayı uygulanır.',
    marginX + 20,
    footerBoxY + 86
  );

  // Alt bilgi çizgisi
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 14px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    `SportsFly Sales&Marketing · Belgeyi Oluşturan: ${createdByName} · ${formatDateTR(new Date().toISOString())}`,
    marginX,
    height - 64
  );

  const imgData = canvas.toDataURL('image/jpeg', 0.94);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

  const datePart = formatDateTR(request.createdAt).replace(/\./g, '');
  const slug = sanitizeFileSlug(club?.name ?? request.title);
  const fileName = `Teklif_Talebi_${slug}_${datePart}.pdf`;

  const dataUrl = pdf.output('datauristring');
  const approxKb = Math.max(48, Math.round((dataUrl.length * 0.75) / 1024));

  if (triggerDownload) {
    pdf.save(fileName);
  }

  const attachment: ClubAttachment = {
    id: `cf-pdf-${Date.now()}`,
    name: fileName,
    sizeLabel: `${approxKb} KB`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: createdByName,
    dataUrl,
  };

  return {
    attachment,
    fileName,
    dataUrl,
  };
}

export function downloadSavedAttachment(file: ClubAttachment): boolean {
  if (!file.dataUrl) return false;
  const link = document.createElement('a');
  link.href = file.dataUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
