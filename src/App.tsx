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

  // Render konten yang bisa dipakai untuk layar HP maupun untuk di-convert ke PDF
  const renderScriptContent = (isForPdf = false) => {
    const fSize = isForPdf ? '13pt' : `${fontSize}px`; // Ukuran font PDF dibuat lebih terbaca

    return (
      <div className={cn(isForPdf && "text-black bg-white")}>
        {isForPdf && (
          <div className="text-center border-b-2 border-emerald-900 pb-4 mb-8">
            <h1 className="text-3xl font-bold font-serif text-emerald-900">Naskah Kultum Ramadhan</h1>
            <p className="text-sm text-stone-500 font-mono">{topic} • {audience}</p>
          </div>
        )}

        {script.map((block, idx) => {
          const mainText = block.text || block.content || block.content_text || block.explanation || block.meat || block.story;
          const cue = block.cue || block.cues || (block.type === 'cues' ? (block.text || block.content) : null);

          return (
            <div key={idx} className={cn("mb-8", isForPdf && "break-inside-avoid")}>
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
                <div className={cn(
                  "font-arabic text-right leading-loose mb-6 p-4 bg-stone-50 rounded border border-stone-200",
                  isForPdf ? "text-xl" : "text-3xl"
                )}>
                  {block.arabic}
                </div>
              )}

              <div style={{ fontSize: fSize }} className="font-serif leading-relaxed text-stone-900">
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
                <div className={cn(
                  "mt-8 text-center p-6 rounded-2xl",
                  isForPdf ? "border-2 border-emerald-900" : "bg-emerald-900 text-white shadow-xl"
                )}>
                  <p className="font-arabic text-2xl leading-loose mb-4">{block.doa_arabic}</p>
                  <p className="font-bold text-amber-400">{block.salam || "Wassalamu'alaikum Wr. Wb."}</p>
                </div>
              )}
            </div>
          );
        })}

        {isForPdf && (
          <div className="mt-8 pt-4 border-t border-stone-200 text-center text-[10px] text-stone-400 font-mono">
            Dibuat secara otomatis dengan MimbarPro AI - by Joze Rizal
          </div>
        )}
      </div>
    );
  };

  // --- SOLUSI UX MOBILE: ONE-CLICK DOWNLOAD ---
  const handleDownloadPdf = () => {
    setIsDownloading(true);
    
    // Kita mengambil container rahasia yang tersembunyi namun sudah dirender utuh
    const element = document.getElementById('pdf-secret-container');
    
    if (!element) {
      alert("Terjadi kesalahan sistem, silakan muat ulang halaman.");
      setIsDownloading(false);
      return;
    }

    // Memanggil library PDF yang sangat umum digunakan
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    
    script.onload = () => {
      // OPTIMASI MOBILE: Scale diturunkan menjadi 1.2 agar ringan di RAM HP tapi tulisan tetap tajam
      const opt = {
        margin: [15, 15, 15, 15], 
        filename: `Naskah_MimbarPro_${topic.substring(0, 15).replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // @ts-ignore
      window.html2pdf().set(opt).from(element).save().then(() => {
        setIsDownloading(false);
      }).catch((err: any) => {
        console.error("PDF Error:", err);
        alert("Gagal memproses PDF di perangkat ini. Coba gunakan browser Chrome.");
        setIsDownloading(false);
      });
    };
    
    script.onerror = () => {
      alert("Gagal memuat sistem PDF. Pastikan internet Anda stabil.");
      setIsDownloading(false);
    };
    
    document.body.appendChild(script);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
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
                    <RotateCcw className="w-4 h-4" /> <span className="hidden md:inline">Reset</span>
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
                className="flex-1 bg-[#FDFBF7] relative overflow-y-auto p-6 md:p-12 scroll-smooth"
              >
                {renderScriptContent(false)}
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

      {/* CONTAINER RAHASIA UNTUK PDF 
          Sengaja di-render di balik layar (z-index negatif dan opacity 0)
          agar strukturnya siap dibaca oleh script PDF tanpa merusak tampilan HP.
      */}
      {step === 'result' && (
        <div className="fixed top-0 left-0 w-[210mm] z-[-50] opacity-0 pointer-events-none">
          <div id="pdf-secret-container" className="p-8 bg-white">
            {renderScriptContent(true)}
          </div>
        </div>
      )}

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
            <p className="text-emerald-200/80 text-sm">Sedang merapikan tata letak PDF Anda...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
