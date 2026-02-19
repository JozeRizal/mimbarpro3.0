/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Moon, 
  Wand2, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  FileDown, 
  Play, 
  Pause, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const RAMADHAN_TOPICS = [
  "Marhaban Ya Ramadhan: Menyambut Tamu Agung",
  "Keutamaan Bulan Ramadhan: Syahrul Mubarak",
  "Tujuan Utama Puasa: Meraih Derajat Taqwa",
  "Syarat & Rukun Puasa: Agar Ibadah Sah",
  "Hal-Hal yang Membatalkan Puasa & Pahala Puasa",
  "Keutamaan Sahur: Berkah di Akhir Malam",
  "Adab Berbuka Puasa & Menyegerakannya",
  "Keutamaan Shalat Tarawih & Witir",
  "Tadarus Al-Qur'an: Menghidupkan Malam Ramadhan",
  "Sedekah di Bulan Ramadhan: Melipatgandakan Pahala",
  "Keutamaan Memberi Makan Orang Berbuka (Ifthar)",
  "Lailatul Qadar: Malam Lebih Baik dari 1000 Bulan",
  "Tanda-Tanda Mendapatkan Lailatul Qadar",
  "Nuzulul Qur'an: Sejarah Turunnya Wahyu Pertama",
  "I'tikaf: Menjemput Ampunan di Masjid",
  "Zakat Fitrah: Mensucikan Jiwa & Harta",
  "Golongan yang Berhak Menerima Zakat (Asnaf)",
  "Orang yang Diperbolehkan Tidak Berpuasa",
  "Membayar Fidyah & Qadha Puasa",
  "Puasa Mata, Telinga, dan Hati (Puasa Khusus)",
  "Bahaya Ghibah: Menggugurkan Pahala Puasa",
  "Menjaga Lisan: Diam itu Emas saat Puasa",
  "Menhan Amarah: Puasa Emosional",
  "Sabar: Intisari Ibadah Puasa",
  "Syukur Nikmat di Bulan Suci",
  "Taubat Nasuha: Momentum Kembali pada Allah",
  "Keajaiban Doa Orang yang Berpuasa",
  "Ramadhan Bulan Pendidikan (Syahrut Tarbiyah)",
  "Ramadhan Bulan Jihad Melawan Hawa Nafsu",
  "Mempererat Ukhuwah Islamiyah & Silaturahmi",
  "Birrul Walidain: Berbakti pada Orang Tua di Ramadhan",
  "Keutamaan Qiyamul Lail",
  "Pintu Ar-Rayyan: Pintu Surga Khusus Orang Berpuasa",
  "Tidur Orang Puasa: Antara Ibadah & Kemalasan",
  "Bau Mulut Orang Puasa: Lebih Wangi dari Kasturi",
  "Larangan Berdusta & Bersaksi Palsu",
  "Meneladani Kedermawanan Nabi di Bulan Ramadhan",
  "Pentingnya Istighfar Menjelang Sahur",
  "Menjaga Shalat 5 Waktu Berjamaah",
  "Dzikir Pagi Petang saat Ramadhan",
  "Meraih Husnul Khotimah di Bulan Suci",
  "Tanda-Tanda Amalan Ramadhan Diterima",
  "Kesedihan Berpisah dengan Ramadhan",
  "Menyambut Idul Fitri dengan Gembira & Syukur",
  "Makna Kembali Fitrah di Hari Raya",
  "Puasa Sunnah 6 Hari di Bulan Syawal",
  "Menjaga Semangat Ibadah Pasca Ramadhan",
  "Bahaya Israf (Berlebih-lebihan) saat Berbuka",
  "Manajemen Waktu Produktif saat Ramadhan",
  "Peran Wanita/Ibu dalam Menghidupkan Ramadhan"
];

interface ScriptBlock {
  type: 'opening' | 'content' | 'doa' | 'cues';
  title?: string;
  arabic?: string;
  text?: string;
  content?: string;
  content_text?: string;
  explanation?: string;
  meat?: string;
  story?: string;
  greeting?: string;
  doa_arabic?: string;
  salam?: string;
  cue?: string;
  cues?: string;
  dalil?: {
    arabic?: string;
    source?: string;
    meaning?: string;
  };
}

export default function App() {
  const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
  const [topic, setTopic] = useState('Keutamaan Menjaga Lisan');
  const [audience, setAudience] = useState('Umum');
  const [duration, setDuration] = useState('5 Menit');
  const [tone, setTone] = useState('Santai');
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptBlock[]>([]);
  const [fontSize, setFontSize] = useState(24);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollAccumulatorRef = useRef(0);

  // --- TELEPROMPTER LOGIC ---
  useEffect(() => {
    let interval: number;
    if (isScrolling && scrollSpeed > 0) {
      interval = window.setInterval(() => {
        if (scrollAreaRef.current) {
          scrollAccumulatorRef.current += (scrollSpeed * 0.3);
          if (scrollAccumulatorRef.current >= 1) {
            const pixelsToMove = Math.floor(scrollAccumulatorRef.current);
            scrollAreaRef.current.scrollTop += pixelsToMove;
            scrollAccumulatorRef.current -= pixelsToMove;
          }
        }
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isScrolling, scrollSpeed]);

  const handleGenerate = async () => {
    const finalKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!finalKey) {
      setError("API Key tidak ditemukan. Pastikan Anda sudah menambahkan VITE_GEMINI_API_KEY di Vercel.");
      return;
    }

    setError(null);
    setStep('loading');

    const systemPrompt = `Anda adalah "MimbarPro", asisten pembuat naskah kultum Islami.
    Output WAJIB berupa JSON Array murni yang berisi objek-objek naskah.
    
    Skema JSON per item:
    {
        "type": "opening" | "content" | "doa",
        "title": "string (Judul Bagian)",
        "arabic": "string (Teks Arab opsional)",
        "text": "string (Isi ceramah)",
        "dalil": { "arabic": "string", "source": "string", "meaning": "string" },
        "cue": "string (Instruksi visual/nada)"
    }
    `;

    const durationMap: Record<string, string> = {
      '3 Menit': 'Buat naskah SANGAT SINGKAT (±300 kata). Fokus 1 poin utama saja.',
      '5 Menit': 'Buat naskah SINGKAT (±500 kata). Fokus 2 poin utama.',
      '7 Menit': 'Buat naskah SEDANG (±800 kata). Penjelasan agak detail dengan contoh.',
      '15 Menit': 'Buat naskah PANJANG (±1500 kata). Bahas mendalam dengan sirah/kisah.',
      '20 Menit': 'Buat naskah SANGAT PANJANG (±2000 kata). Kajian mendalam, banyak dalil dan kisah.'
    };

    const durInstruction = durationMap[duration] || duration;
    const userQuery = `Topik: ${topic}, Audience: ${audience}, Durasi: ${duration}. Instruksi Panjang: ${durInstruction}, Tone: ${tone}`;

    try {
      const ai = new GoogleGenAI({ apiKey: finalKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ parts: [{ text: userQuery }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const raw = response.text;
      const parsed = JSON.parse(raw);
      let finalScript = Array.isArray(parsed) ? parsed : (parsed.script || parsed.data || []);

      if (finalScript.length > 0) {
        setScript(finalScript);
        setStep('result');
      } else {
        throw new Error("Hasil naskah kosong.");
      }
    } catch (e: any) {
      console.error(e);
      setError(`Gagal: ${e.message}`);
      setStep('input');
    }
  };

  const formatLongText = (text?: string) => {
    if (!text) return null;
    const MAX_LENGTH = 450;
    if (text.length <= MAX_LENGTH) return <p className="mb-4 text-justify">{text}</p>;

    const sentences = text.split('. ');
    let paragraphs: string[] = [];
    let currentPara = "";

    sentences.forEach((sentence, index) => {
      const s = sentence + (index < sentences.length - 1 ? '. ' : '');
      if ((currentPara + s).length > MAX_LENGTH) {
        if (currentPara) paragraphs.push(currentPara);
        currentPara = s;
      } else {
        currentPara += s;
      }
    });
    if (currentPara) paragraphs.push(currentPara);

    return paragraphs.map((p, i) => (
      <p key={i} className="mb-4 text-justify">{p}</p>
    ));
  };

  // Render konten layar (Screen View)
  const renderScriptContent = () => {
    return (
      <div className="text-black bg-[#FDFBF7] w-full max-w-4xl">
        {script.map((block, idx) => {
          const mainText = block.text || block.content || block.content_text || block.explanation || block.meat || block.story;
          const cue = block.cue || block.cues || (block.type === 'cues' ? (block.text || block.content) : null);

          return (
            <div key={idx} className="mb-8">
              {cue && (
                <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-2 text-xs font-bold uppercase text-amber-800">
                  💡 {cue}
                </div>
              )}

              {block.title && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px bg-stone-300 flex-1"></div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{block.title}</span>
                  <div className="h-px bg-stone-300 flex-1"></div>
                </div>
              )}

              {block.arabic && block.arabic.length > 2 && (
                <div className="font-arabic text-right leading-loose mb-6 p-4 bg-stone-50 rounded border border-stone-200 text-3xl">
                  {block.arabic}
                </div>
              )}

              <div style={{ fontSize: `${fontSize}px` }} className="font-serif leading-relaxed text-stone-900">
                {block.greeting && <p className="font-bold text-emerald-800 mb-2">{block.greeting}</p>}
                {formatLongText(mainText)}

                {block.dalil && (block.dalil.arabic || block.dalil.meaning) && (
                  <div className="mt-4 p-4 border rounded-xl bg-white border-stone-200">
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">Dalil</span>
                    <p className="font-arabic text-right text-xl mt-2">{block.dalil.arabic}</p>
                    <p className="text-xs text-amber-700 font-bold mt-2">{block.dalil.source}</p>
                    <p className="text-sm text-stone-500 italic mt-1">"{block.dalil.meaning}"</p>
                  </div>
                )}
              </div>

              {block.doa_arabic && block.doa_arabic.length > 2 && (
                <div className="mt-8 text-center p-6 rounded-2xl bg-emerald-900 text-white shadow-xl">
                  <p className="font-arabic text-2xl leading-loose mb-4">{block.doa_arabic}</p>
                  <p className="font-bold text-amber-400">{block.salam || "Wassalamu'alaikum Wr. Wb."}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // --- SOLUSI ANTI-CRASH OKLCH UNTUK PDF ---
  // Kita merender murni HTML/CSS jadul (Hex) tanpa ada campur tangan Tailwind
  const generatePdfHtmlString = () => {
    let html = `
      <div style="font-family: Georgia, serif; color: #1c1917; background-color: #ffffff; padding: 20px 40px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #064e3b; padding-bottom: 16px; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: bold; color: #064e3b; margin: 0 0 8px 0; font-family: serif;">Naskah Kultum Ramadhan</h1>
          <p style="font-size: 14px; color: #78716c; font-family: monospace; margin: 0;">${topic} &bull; ${audience}</p>
        </div>
    `;

    script.forEach(block => {
      const mainText = block.text || block.content || block.content_text || block.explanation || block.meat || block.story;
      const cue = block.cue || block.cues || (block.type === 'cues' ? (block.text || block.content) : null);

      html += `<div style="margin-bottom: 32px; page-break-inside: avoid;">`;

      if (cue) {
        html += `<div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 8px 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #92400e; margin-bottom: 16px; font-family: sans-serif;">💡 ${cue}</div>`;
      }

      if (block.title) {
        html += `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <div style="flex: 1; height: 1px; background-color: #d6d3d1;"></div>
            <span style="font-size: 10px; font-weight: bold; color: #a8a29e; text-transform: uppercase; letter-spacing: 2px; font-family: sans-serif;">${block.title}</span>
            <div style="flex: 1; height: 1px; background-color: #d6d3d1;"></div>
          </div>
        `;
      }

      if (block.arabic && block.arabic.length > 2) {
        html += `<div style="font-family: 'Traditional Arabic', 'Amiri', serif; text-align: right; line-height: 2.2; margin-bottom: 24px; padding: 16px; background-color: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; font-size: 22px;">${block.arabic}</div>`;
      }

      if (mainText) {
        html += `<div style="font-family: Georgia, serif; line-height: 1.8; color: #1c1917; font-size: 13pt; margin-bottom: 16px;">`;
        if (block.greeting) {
          html += `<p style="font-weight: bold; color: #064e3b; margin-bottom: 8px;">${block.greeting}</p>`;
        }

        const sentences = mainText.split('. ');
        let currentPara = "";
        sentences.forEach((sentence, index) => {
          const s = sentence + (index < sentences.length - 1 ? '. ' : '');
          if ((currentPara + s).length > 450) {
            if (currentPara) {
              html += `<p style="margin-bottom: 16px; text-align: justify;">${currentPara}</p>`;
            }
            currentPara = s;
          } else {
            currentPara += s;
          }
        });
        if (currentPara) {
          html += `<p style="margin-bottom: 16px; text-align: justify;">${currentPara}</p>`;
        }
        
        html += `</div>`;
      }

      if (block.dalil && (block.dalil.arabic || block.dalil.meaning)) {
        html += `
          <div style="margin-top: 16px; padding: 16px; border: 1px solid #e7e5e4; border-radius: 12px; background-color: #ffffff;">
            <span style="background-color: #d1fae5; color: #065f46; font-weight: bold; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; font-size: 10px; font-family: sans-serif;">Dalil</span>
            <p style="font-family: 'Traditional Arabic', 'Amiri', serif; text-align: right; font-size: 20px; margin-top: 12px; margin-bottom: 8px; line-height: 2;">${block.dalil.arabic || ''}</p>
            <p style="font-size: 12px; color: #b45309; font-weight: bold; margin-top: 8px; margin-bottom: 4px; font-family: sans-serif;">${block.dalil.source || ''}</p>
            <p style="font-size: 14px; color: #78716c; font-style: italic; margin-top: 4px; margin-bottom: 0;">"${block.dalil.meaning || ''}"</p>
          </div>
        `;
      }

      if (block.doa_arabic && block.doa_arabic.length > 2) {
        html += `
          <div style="margin-top: 32px; text-align: center; padding: 24px; border-radius: 16px; border: 2px solid #064e3b; page-break-inside: avoid;">
            <p style="font-family: 'Traditional Arabic', 'Amiri', serif; font-size: 26px; line-height: 2.2; margin-bottom: 16px;">${block.doa_arabic}</p>
            <p style="font-weight: bold; color: #b45309; font-family: sans-serif; font-size: 16px;">${block.salam || "Wassalamu'alaikum Wr. Wb."}</p>
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `
        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e7e5e4; text-align: center; font-size: 10px; color: #a8a29e; font-family: monospace;">
          Dibuat secara otomatis dengan MimbarPro AI - by Joze Rizal
        </div>
      </div>
    `;

    return html;
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);

    const htmlContent = generatePdfHtmlString();

    // 1. Buat iframe isolasi agar kebal dari Tailwind dan error oklch
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px'; 
    iframe.style.width = '1024px'; // Paksa ukuran desktop
    iframe.style.height = '1000px';
    document.body.appendChild(iframe);

    const idoc = iframe.contentWindow?.document;
    if (!idoc) {
      alert("Gagal memproses dokumen. Coba refresh halaman.");
      setIsDownloading(false);
      return;
    }

    // 2. Suntikkan HTML murni dan Script PDF ke dalam iframe
    idoc.open();
    idoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        </head>
        <body style="margin: 0; background: #ffffff;">
          <div id="pdf-root">${htmlContent}</div>
        </body>
      </html>
    `);
    idoc.close();

    // 3. Eksekusi PDF dari dalam iframe secara otomatis
    const checkAndGenerate = () => {
      // @ts-ignore
      if (iframe.contentWindow && iframe.contentWindow.html2pdf) {
        const element = idoc.getElementById('pdf-root');
        const opt = {
          margin: [15, 10, 15, 10], // Margin atas, kanan, bawah, kiri
          filename: `Naskah_MimbarPro_${topic.substring(0, 15).replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 1.5, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        iframe.contentWindow.html2pdf().set(opt).from(element).save().then(() => {
          setIsDownloading(false);
          document.body.removeChild(iframe); // Bersihkan iframe setelah selesai
        }).catch((err: any) => {
          console.error(err);
          alert("Gagal memproses PDF.");
          setIsDownloading(false);
          document.body.removeChild(iframe);
        });
      } else {
        setTimeout(checkAndGenerate, 200); // Tunggu sampai script termuat
      }
    };

    setTimeout(checkAndGenerate, 200);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#FDFBF7]">
      {/* HEADER */}
      <header className="bg-emerald-900 border-b border-emerald-800 sticky top-0 z-30 shadow-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-800 border border-emerald-700 text-amber-400 p-2 rounded-lg shadow-inner">
              <Moon className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Mimbar<span className="text-amber-400">Pro</span>
              <span className="text-[10px] font-normal text-emerald-100 bg-emerald-800/50 border border-emerald-700 px-2 py-0.5 rounded-full ml-2 uppercase tracking-wider">Ramadhan</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 relative w-full">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-6 w-full"
            >
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-stone-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600"></div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-emerald-900 font-serif">Studio Naskah</h2>
                  <p className="text-stone-500 mt-2">Racik materi dakwah mendalam dengan kecerdasan buatan.</p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-sm font-medium mb-6">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Topik Kajian</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    />
                    <select
                      onChange={(e) => setTopic(e.target.value)}
                      className="mt-2 w-full p-2 bg-stone-100 text-sm rounded border border-stone-200 outline-none text-stone-600"
                    >
                      <option value="">...pilih inspirasi topik Ramadhan</option>
                      {RAMADHAN_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Audiens</label>
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="w-full p-3 border border-stone-300 rounded-lg bg-white outline-none"
                      >
                        <option>Umum</option>
                        <option>Anak Muda / Milenial</option>
                        <option>Bapak-bapak</option>
                        <option>Ibu-ibu Pengajian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Durasi</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full p-3 border border-stone-300 rounded-lg bg-white outline-none"
                      >
                        <option>3 Menit</option>
                        <option>5 Menit</option>
                        <option>7 Menit</option>
                        <option>15 Menit</option>
                        <option>20 Menit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">Tone</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Santai', 'Tegas', 'Menyentuh', 'Semangat'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={cn(
                            "p-2 text-sm rounded border transition",
                            tone === t
                              ? "bg-emerald-800 text-white border-emerald-800"
                              : "bg-white border-stone-200 hover:bg-emerald-50"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="w-full py-4 font-bold rounded-xl shadow-lg bg-gradient-to-r from-emerald-700 to-emerald-900 text-white hover:from-emerald-800 hover:to-emerald-950 transition transform active:scale-[0.98] flex justify-center items-center gap-2 mt-2"
                  >
                    <Wand2 className="w-5 h-5 text-amber-400" /> Buat Naskah Sekarang
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {step === 'loading' && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-96 flex flex-col items-center justify-center text-center"
            >
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
              <p className="text-emerald-900 font-bold text-lg">Sedang Meracik Naskah...</p>
              <p className="text-stone-500 text-sm">Menyusun dalil dan narasi dakwah...</p>
            </motion.section>
          )}

          {step === 'result' && (
            <motion.section
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col h-[calc(100vh-140px)] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden bg-white w-full relative"
            >
              <div className="bg-emerald-950 text-stone-300 p-4 flex items-center justify-between z-10 border-b border-emerald-900">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setStep('input')}
                    className="flex items-center gap-2 hover:text-white transition text-sm font-medium"
                  >
                    <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Reset</span>
                  </button>
                  <div className="h-6 w-px bg-emerald-800"></div>
                  <div className="flex items-center gap-1 bg-emerald-900/50 rounded-lg p-1 border border-emerald-800">
                    <button
                      onClick={() => setFontSize(prev => Math.max(16, prev - 2))}
                      className="p-1 hover:bg-emerald-800 rounded text-white"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono w-6 text-center text-amber-400">{fontSize}</span>
                    <button
                      onClick={() => setFontSize(prev => Math.min(48, prev + 2))}
                      className="p-1 hover:bg-emerald-800 rounded text-white"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg font-bold shadow-sm transition active:scale-95"
                  >
                    <FileDown className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wide hidden sm:inline">Download PDF</span>
                  </button>
                  <div className="w-px h-6 bg-emerald-800"></div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={scrollSpeed}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setScrollSpeed(val);
                        setIsScrolling(val > 0);
                      }}
                      className="w-16 md:w-20 h-1.5 bg-emerald-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <button
                      onClick={() => {
                        if (!isScrolling && scrollSpeed === 0) setScrollSpeed(1);
                        setIsScrolling(!isScrolling);
                      }}
                      className="p-2 rounded-full shadow-lg bg-emerald-600 text-white"
                    >
                      {isScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={scrollAreaRef}
                className="flex-1 relative overflow-y-auto p-6 md:p-12 scroll-smooth"
              >
                {renderScriptContent()}
                {isScrolling && (
                  <div className="fixed bottom-8 right-8 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse z-20 font-bold text-xs flex gap-2 items-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div> ON AIR
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* OVERLAY LOADING SAAT DOWNLOAD PDF */}
      <AnimatePresence>
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white"
          >
            <Loader2 className="w-16 h-16 animate-spin mb-6 text-amber-400" />
            <h3 className="font-serif font-bold text-2xl mb-2">Menyiapkan Dokumen</h3>
            <p className="text-emerald-200/80 text-sm px-8 text-center">Sedang merapikan tata letak PDF Anda, mohon tunggu...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
