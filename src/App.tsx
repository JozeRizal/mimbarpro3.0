/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertCircle, 
  Key,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
// @ts-ignore
import html2pdf from 'html2pdf.js';
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
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<ScriptBlock[]>([]);
  const [fontSize, setFontSize] = useState(24);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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
    const finalKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalKey) {
      setError("Mohon masukkan API Key Gemini terlebih dahulu.");
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

  const renderScriptContent = (mode: 'screen' | 'print') => {
    const isPrint = mode === 'print';
    const fSize = isPrint ? '12pt' : `${fontSize}px`;

    return (
      <div className={cn(isPrint && "text-black")}>
        {isPrint && (
          <div className="text-center border-b-2 border-emerald-900 pb-4 mb-8">
            <h1 className="text-3xl font-bold font-serif text-emerald-900">Naskah Kultum Ramadhan</h1>
            <p className="text-sm text-stone-500 font-mono">{topic} • {audience}</p>
          </div>
        )}

        {script.map((block, idx) => {
          const mainText = block.text || block.content || block.content_text || block.explanation || block.meat || block.story;
          const cue = block.cue || block.cues || (block.type === 'cues' ? (block.text || block.content) : null);

          return (
            <div key={idx} className={cn("mb-8", isPrint && "page-break-inside-avoid")}>
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
                  "font-arabic text-right leading-loose mb-6 p-4 bg-stone-50 rounded border border-stone-100",
                  isPrint ? "text-xl" : "text-3xl"
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
                  isPrint ? "border-2 border-emerald-900" : "bg-emerald-900 text-white shadow-xl"
                )}>
                  <p className="font-arabic text-2xl leading-loose mb-4">{block.doa_arabic}</p>
                  <p className="font-bold text-amber-400">{block.salam || "Wassalamu'alaikum Wr. Wb."}</p>
                </div>
              )}
            </div>
          );
        })}

        {isPrint && (
          <div className="mt-8 pt-4 border-t border-stone-200 text-center text-[10px] text-stone-400 font-mono">
            Dibuat secara otomatis dengan MimbarPro AI
          </div>
        )}
      </div>
    );
  };

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    const element = document.getElementById('final-print-area');
    const opt = {
      margin: 0,
      filename: `Naskah_MimbarPro_${topic.substring(0, 15).replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    setTimeout(() => {
      html2pdf().set(opt).from(element).save().then(() => {
        setIsDownloading(false);
        setShowPreview(false);
      }).catch((err: any) => {
        console.error(err);
        alert("Gagal mengunduh PDF. Silakan coba lagi.");
        setIsDownloading(false);
      });
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col">
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
          <div className="hidden md:flex items-center gap-2 text-emerald-200/60 text-xs font-mono">
            <span>AI Powered by Gemini 2.0</span>
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
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-2 uppercase tracking-wide">
                      <Key className="w-3 h-3 text-amber-600" /> API Key Gemini
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full p-3 border border-emerald-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      placeholder="Tempel API Key Gemini (AIza...)"
                    />
                    <p className="text-[10px] text-emerald-600/70 mt-2 italic">*Kunci tidak disimpan di server, aman untuk privasi.</p>
                  </div>

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
              className="flex flex-col h-[calc(100vh-140px)] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden bg-white w-full"
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
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg border border-emerald-700 shadow-sm transition"
                  >
                    <FileDown className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wide hidden md:inline">Download PDF</span>
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
                {renderScriptContent('screen')}
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

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[50] bg-stone-800/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-[210mm] min-h-[90vh] shadow-2xl rounded-sm flex flex-col relative"
            >
              <div className="bg-emerald-900 text-white p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm">Pratinjau PDF</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg text-sm"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download Sekarang"}
                  </button>
                </div>
              </div>
              <div className="bg-white flex-1 p-10 overflow-y-auto">
                {renderScriptContent('print')}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HIDDEN PRINT AREA */}
      <div className="fixed -left-[9999px] top-0">
        <div id="final-print-area" className="bg-white w-[210mm] min-h-[297mm] p-10">
          {renderScriptContent('print')}
        </div>
      </div>

      {/* DOWNLOAD OVERLAY */}
      {isDownloading && (
        <div className="fixed inset-0 z-[9999] bg-stone-800/95 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-amber-400" />
          <p className="font-bold text-lg">Sedang Mencetak PDF...</p>
        </div>
      )}
    </div>
  );
}
