"use client";

import { useState } from "react";
import { Camera, Loader2, AlertCircle, Sparkles, Save } from "lucide-react";
import { scanScorecardAction, saveExtractedCourseAction, updateCourseFromScanAction } from "@/app/actions";

interface ExtractedHole {
    holeNumber: number;
    par: number;
    handicapIndex: number;
    yardage?: number;
}

interface ExtractedTee {
    name: string;
    par: number;
    rating: string;
    slope: number;
    holes: ExtractedHole[];
}

interface ExtractedCourse {
    name: string;
    city: string;
    state: string;
    tees: ExtractedTee[];
}

interface ScorecardScannerProps {
    leagueSlug: string;
    courseId?: string;
    initialName?: string;
    initialCity?: string;
    initialState?: string;
}

export function ScorecardScanner({ leagueSlug, courseId }: ScorecardScannerProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedCourse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleScan = async () => {
        if (!file) return;

        setIsScanning(true);
        setError(null);
        const formData = new FormData();
        formData.append("scorecard", file);

        try {
            const data = await scanScorecardAction(formData);
            setExtractedData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to scan scorecard");
        } finally {
            setIsScanning(false);
        }
    };

    const handleSave = async () => {
        if (!extractedData) return;

        setIsSaving(true);
        try {
            if (courseId) {
                await updateCourseFromScanAction(courseId, extractedData, leagueSlug);
            } else {
                await saveExtractedCourseAction(extractedData, leagueSlug);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save course");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {!extractedData ? (
                <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-3xl text-center group hover:border-emerald-500/50 transition-all">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                        <Camera size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{courseId ? "Update via Scorecard Scan" : "Scan Physical Scorecard"}</h3>
                    <p className="text-zinc-500 max-w-xs mb-8">
                        {courseId
                            ? "Scan a new scorecard to completely replace the existing tee and hole data for this course."
                            : "Take a photo of your scorecard. Our AI will extract all course, tee, and hole data instantly."
                        }
                    </p>

                    <label className="relative cursor-pointer">
                        <span className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold transition-all inline-block">
                            {file ? file.name : "Select Image"}
                        </span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>

                    {file && (
                        <button
                            onClick={handleScan}
                            disabled={isScanning}
                            className="mt-6 px-12 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3 transition-all disabled:opacity-50"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Analyzing Scorecard...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Run AI Extraction
                                </>
                            )}
                        </button>
                    )}

                    {error && (
                        <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Sparkles size={120} className="text-emerald-500" />
                        </div>

                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-2">Extraction Results</div>
                                <input
                                    type="text"
                                    value={extractedData.name || ""}
                                    placeholder="Enter Course Name"
                                    onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                                    className="text-3xl font-black bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 outline-none transition-colors w-full pb-2 mb-2 placeholder:text-zinc-700"
                                />
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        value={extractedData.city || ""}
                                        placeholder="City"
                                        onChange={(e) => setExtractedData({ ...extractedData, city: e.target.value })}
                                        className="bg-transparent text-sm text-zinc-500 border-b border-transparent hover:border-zinc-800 focus:border-emerald-500 outline-none transition-colors w-32"
                                    />
                                    <input
                                        type="text"
                                        value={extractedData.state || ""}
                                        placeholder="State"
                                        onChange={(e) => setExtractedData({ ...extractedData, state: e.target.value })}
                                        className="bg-transparent text-sm text-zinc-500 border-b border-transparent hover:border-zinc-800 focus:border-emerald-500 outline-none transition-colors w-16"
                                    />
                                </div>
                            </div>
                            <button onClick={() => setExtractedData(null)} className="text-sm text-zinc-500 hover:text-white underline underline-offset-4">Retake Photo</button>
                        </div>

                        <div className="space-y-4">
                            {extractedData.tees.map((tee, idx) => (
                                <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="font-bold text-lg">{tee.name} Tee</span>
                                        </div>
                                        <div className="flex gap-6 text-xs">
                                            <div>
                                                <span className="text-zinc-500 uppercase mr-2">Rating</span>
                                                <span className="font-mono font-bold">{tee.rating}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 uppercase mr-2">Slope</span>
                                                <span className="font-mono font-bold">{tee.slope}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 uppercase mr-2">Par</span>
                                                <span className="font-mono font-bold">{tee.par}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-9 gap-1">
                                        {tee.holes.slice(0, 9).map(h => (
                                            <div key={h.holeNumber} className="text-center p-2 bg-zinc-900/50 rounded-lg flex flex-col justify-between h-20">
                                                <div className="text-[10px] text-zinc-600 font-bold">{h.holeNumber}</div>
                                                <div className="text-sm font-black text-white">{h.par}</div>
                                                <div className="flex justify-between w-full px-1">
                                                    <span className="text-[9px] text-zinc-500 font-mono tracking-tighter" title="Yardage">{h.yardage || '-'}</span>
                                                    <span className="text-[9px] text-emerald-500 font-mono font-bold tracking-tighter" title="Handicap">{h.handicapIndex}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-9 gap-1 mt-1">
                                        {tee.holes.slice(9, 18).map(h => (
                                            <div key={h.holeNumber} className="text-center p-2 bg-zinc-900/50 rounded-lg flex flex-col justify-between h-20">
                                                <div className="text-[10px] text-zinc-600 font-bold">{h.holeNumber}</div>
                                                <div className="text-sm font-black text-white">{h.par}</div>
                                                <div className="flex justify-between w-full px-1">
                                                    <span className="text-[9px] text-zinc-500 font-mono tracking-tighter" title="Yardage">{h.yardage || '-'}</span>
                                                    <span className="text-[9px] text-emerald-500 font-mono font-bold tracking-tighter" title="Handicap">{h.handicapIndex}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full mt-8 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-sm rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {isSaving ? "Saving Database..." : "Confirm & Save Course"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
