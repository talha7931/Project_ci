import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  Server,
  Activity,
  Code,
  FileText,
  Search,
  Sparkles,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (typeof window === 'undefined') return raw;
  try {
    const configured = new URL(raw, window.location.origin);
    // Same Render Web Service: always use relative /health and /predict paths.
    if (configured.origin === window.location.origin) return '';
    return raw;
  } catch {
    return '';
  }
}

const API_BASE_URL = resolveApiBaseUrl();

function formatApiDetail(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
      .join('; ');
  }
  return JSON.stringify(detail);
}

async function readApiJson(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!text || !text.trim()) {
    throw new Error(
      `Empty response from ${response.url || 'the API'} (HTTP ${response.status}). The server did not return JSON.`
    );
  }

  const looksLikeJson = contentType.includes('application/json') || /^[[{]/.test(text.trim());
  if (!looksLikeJson) {
    throw new Error(
      `Expected JSON from the API but received ${contentType || 'a non-JSON response'} (HTTP ${response.status}).`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The server returned invalid JSON.');
  }
}

const PRESET_URLS = [
  {
    label: 'Clean Domain',
    url: 'https://www.wikipedia.org',
    type: 'legit'
  },
  {
    label: 'Standard Portal',
    url: 'https://github.com/torvalds/linux',
    type: 'legit'
  },
  {
    label: 'Raw IP Phishing',
    url: 'http://192.168.1.1/login-bank-account-verify.html',
    type: 'suspicious'
  },
  {
    label: 'Brand Spoof Domain',
    url: 'http://paypal-security-update-account-verification-alert.com/signin',
    type: 'suspicious'
  },
  {
    label: 'Shortened / Subdomain',
    url: 'http://free-bonus-wallet-recover.xyz/update',
    type: 'suspicious'
  }
];

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    status: 'connecting',
    model_loaded: false,
    model_name: 'Random Forest',
    scikit_learn_version: '...',
  });

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const data = await readApiJson(res);
        if (!res.ok) throw new Error(formatApiDetail(data.detail) || 'Backend responded with error');
        return data;
      })
      .then((data) => setSystemHealth(data))
      .catch((err) => {
        console.warn('Backend connection note:', err.message);
        setSystemHealth({
          status: 'offline',
          model_loaded: false,
          model_name: 'Unavailable',
          scikit_learn_version: 'Unknown',
        });
      });
  }, []);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      setError('Please enter a URL to analyze.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await readApiJson(response);
      if (!response.ok) {
        throw new Error(formatApiDetail(data.detail) || `Server returned status ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred during prediction analysis.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (presetUrl) => {
    setUrlInput(presetUrl);
    setError(null);
  };

  const copyUrl = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans cyber-grid">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 border-b border-cyber-700/60 bg-cyber-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyber-blue/15 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent shadow-lg shadow-cyber-blue/10">
              <Shield className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white">URL Sentinel</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                  v1.0 ML
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Intelligent Malicious URL Detection Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Status indicator */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cyber-900 border border-cyber-700/80 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemHealth.status === 'healthy'
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-ping'
                    : systemHealth.status === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-300 font-mono">
                {systemHealth.status === 'healthy'
                  ? 'Core Ready (RF-100)'
                  : systemHealth.status === 'connecting'
                  ? 'Connecting...'
                  : 'Backend Standby'}
              </span>
            </div>

            <a
              href="#model-info"
              className="text-xs font-medium text-slate-400 hover:text-cyber-accent transition-colors hidden md:block"
            >
              Model Benchmarks
            </a>
            <a
              href="#architecture"
              className="text-xs font-medium text-slate-400 hover:text-cyber-accent transition-colors hidden md:block"
            >
              Architecture
            </a>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* ── Hero / Input Section ── */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-2 sm:pt-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyber-blue/10 border border-cyber-accent/30 text-cyber-accent text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ensemble Learning System &bull; Bagging vs. Boosting</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Intelligent Threat Radar for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500">
              Malicious URLs
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Protect systems against phishing, credential harvesting, and deceptive redirects using an optimized{' '}
            <span className="text-white font-medium">Random Forest ensemble</span> evaluating six critical lexical and
            syntactic URL features.
          </p>

          {/* URL Input Form */}
          <form onSubmit={handleAnalyze} className="mt-8 space-y-3">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 pointer-events-none">
                <Globe className="w-5 h-5 text-cyber-accent" />
              </div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter URL to inspect (e.g. google.com or http://192.168.1.1/login.php)"
                className="w-full pl-12 pr-32 py-4 rounded-xl bg-cyber-900/90 border border-cyber-600/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyber-accent focus:ring-2 focus:ring-cyber-accent/20 transition-all font-mono text-sm shadow-xl"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !urlInput.trim()}
                className="absolute right-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyze URL</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-rose-400 text-xs text-left bg-rose-950/40 border border-rose-800/60 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Preset URL Pills */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-400 text-xs">Test Sample:</span>
              {PRESET_URLS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPreset(item.url)}
                  className={`px-2.5 py-1 rounded-md border font-mono transition-all ${
                    item.type === 'legit'
                      ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50'
                      : 'border-rose-800/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </form>
        </section>

        {/* ── Section B: Prediction Results ── */}
        {result && (
          <section className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-cyber-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyber-accent" />
                <h2 className="text-lg font-bold text-white tracking-wide uppercase">Inspection Report</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Model: {result.model_name} (Bagging)</span>
            </div>

            {/* Verdict Card */}
            <div
              className={`rounded-2xl p-6 sm:p-8 border shadow-2xl transition-all ${
                result.predicted_class === 1
                  ? 'bg-gradient-to-b from-rose-950/40 via-cyber-900/90 to-cyber-950 border-rose-500/40 shadow-rose-950/40'
                  : 'bg-gradient-to-b from-emerald-950/40 via-cyber-900/90 to-cyber-950 border-emerald-500/40 shadow-emerald-950/40'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl ${
                      result.predicted_class === 1
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {result.predicted_class === 1 ? (
                      <ShieldAlert className="w-9 h-9" />
                    ) : (
                      <ShieldCheck className="w-9 h-9" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3
                        className={`text-2xl sm:text-3xl font-black tracking-tight ${
                          result.predicted_class === 1 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {result.label.toUpperCase()}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold uppercase ${
                          result.predicted_class === 1
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        Class {result.predicted_class}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">
                      {result.predicted_class === 1
                        ? 'High probability of malicious intent, credential phishing, or syntactic deception.'
                        : 'Lexical patterns align with legitimate domain structures.'}
                    </p>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="w-full md:w-auto bg-cyber-950/80 border border-cyber-700 rounded-xl p-4 min-w-[220px]">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                    <span>Model Confidence</span>
                    <span className="font-mono text-white font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-cyber-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        result.predicted_class === 1 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(result.confidence * 100, 5)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
                    <span>Legit: {(result.probabilities.Legitimate * 100).toFixed(1)}%</span>
                    <span>Malicious: {(result.probabilities.Malicious * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Analyzed URL preview strip */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-cyber-950/50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 overflow-hidden w-full">
                  <Terminal className="w-4 h-4 text-cyber-accent flex-shrink-0" />
                  <span className="text-xs text-slate-400 flex-shrink-0">Analyzed String:</span>
                  <span className="text-xs font-mono text-cyan-300 truncate">{result.url}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyUrl(result.url)}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 flex-shrink-0 bg-cyber-800 px-2 py-1 rounded"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Extracted Features Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 tracking-wider uppercase flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Extracted Feature Breakdown (6 Lexical Attributes)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Feature 1: URL Length */}
                <div className="glass-card rounded-xl p-4 border border-cyber-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">1. url_length</span>
                    <span className="text-base font-bold font-mono text-cyan-300">{result.features.url_length}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Total characters. Unusually long URLs frequently camouflage subdomains or nested redirects.
                  </p>
                </div>

                {/* Feature 2: HTTPS Status */}
                <div className="glass-card rounded-xl p-4 border border-cyber-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">2. has_https</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                        result.features.has_https === 1
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {result.features.has_https === 1 ? 'YES (1)' : 'NO (0)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Protocol prefix check. Note that malicious sites also adopt SSL certificates to evade primitive checks.
                  </p>
                </div>

                {/* Feature 3: IP Address Authority */}
                <div className="glass-card rounded-xl p-4 border border-cyber-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">3. has_ip</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                        result.features.has_ip === 1
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {result.features.has_ip === 1 ? 'DETECTED (1)' : 'CLEAN (0)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Direct IP address instead of domain name. A strong classic indicator of phishing hosts.
                  </p>
                </div>

                {/* Feature 4: Dot Count */}
                <div className="glass-card rounded-xl p-4 border border-cyber-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">4. dot_count</span>
                    <span className="text-base font-bold font-mono text-cyan-300">{result.features.dot_count}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Frequency of '.' characters. Multi-level subdomains are commonly created to deceive mobile users.
                  </p>
                </div>

                {/* Feature 5: Hyphen Count */}
                <div className="glass-card rounded-xl p-4 border border-cyber-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">5. hyphen_count</span>
                    <span className="text-base font-bold font-mono text-cyan-300">{result.features.hyphen_count}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Frequency of '-' characters. Often used in typosquatting and fake brand composition.
                  </p>
                </div>

                {/* Feature 6: Suspicious Keyword Count */}
                <div className="glass-card rounded-xl p-4 border border-cyber-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">6. keyword_count</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        result.features.keyword_count > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {result.features.keyword_count}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Matches against 17 credential/banking tokens (e.g., login, verify, secure, account, paypal).
                  </p>
                </div>
              </div>
            </div>

            {/* Disclaimer Alert */}
            <div className="p-4 rounded-xl bg-cyber-900/60 border border-cyber-700/80 flex items-start space-x-3 text-xs text-slate-300">
              <Info className="w-5 h-5 text-cyber-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Analytical Disclaimer</p>
                <p className="text-slate-400 leading-relaxed">{result.disclaimer}</p>
              </div>
            </div>
          </section>
        )}

        {/* ── Section C: Model Architecture & Verified Benchmarks ── */}
        <section id="model-info" className="space-y-6 pt-4">
          <div className="border-b border-cyber-700/60 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-cyber-accent" />
              <h2 className="text-lg font-bold text-white tracking-wide uppercase">
                Model Architecture & Verified Benchmarks
              </h2>
            </div>
            <span className="text-xs text-cyan-400 font-mono">100 Estimators &bull; Bagging</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bagging Explanation Card */}
            <div className="glass-card rounded-2xl p-6 border border-cyber-700/60 space-y-4">
              <div className="w-10 h-10 rounded-lg bg-cyber-blue/15 border border-cyber-accent/40 flex items-center justify-center text-cyber-accent">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Why Random Forest (Bagging)?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Random Forest employs <strong>Bootstrap Aggregating (Bagging)</strong>. It trains 100 decorrelated
                decision trees in parallel over random bootstrap subsets of the training data and feature subspace.
              </p>
              <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-cyber-700/60">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Substantially reduces variance without increasing model bias</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>High robustness against outlier URLs and skewed sub-paths</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Outperformed sequential AdaBoost boosting on all 5 key metrics</span>
                </div>
              </div>
            </div>

            {/* Verified Metrics Table Card */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-cyber-700/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">Experimental Benchmark Comparison</h3>
                  <p className="text-xs text-slate-400">
                    Evaluated on <strong>96,167 independent test URLs</strong> from an empirical corpus of{' '}
                    <strong>448,779 training samples</strong>.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-cyber-800 text-cyan-300 border border-cyber-600">
                  Verified Data
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-cyber-700/80 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Ensemble Model</th>
                      <th className="py-2.5 px-3">Technique</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Precision</th>
                      <th className="py-2.5 px-3">Recall</th>
                      <th className="py-2.5 px-3">F1-Score</th>
                      <th className="py-2.5 px-3">ROC-AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-800/60">
                    <tr className="bg-cyber-blue/10 text-white font-semibold">
                      <td className="py-3 px-3 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span>Random Forest</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900 text-cyan-300 border border-cyan-700">
                          Selected
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">Bagging</td>
                      <td className="py-3 px-3 text-cyan-300">79.58%</td>
                      <td className="py-3 px-3 text-cyan-300">73.54%</td>
                      <td className="py-3 px-3 text-cyan-300">60.23%</td>
                      <td className="py-3 px-3 text-cyan-300 font-bold">0.6622</td>
                      <td className="py-3 px-3 text-cyan-300 font-bold">0.8490</td>
                    </tr>
                    <tr className="text-slate-400">
                      <td className="py-3 px-3 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        <span>AdaBoost</span>
                      </td>
                      <td className="py-3 px-3">Boosting</td>
                      <td className="py-3 px-3">77.38%</td>
                      <td className="py-3 px-3">69.45%</td>
                      <td className="py-3 px-3">56.99%</td>
                      <td className="py-3 px-3">0.6261</td>
                      <td className="py-3 px-3">0.8068</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 border-t border-cyber-700/60">
                <span>Margin of Superiority: Random Forest exceeded AdaBoost by +3.61% F1 and +4.22% ROC-AUC.</span>
                <span className="text-slate-400">Random Forest Test Support: 64,211 Legit / 31,956 Malicious</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section D: Architecture & Methodology ── */}
        <section id="architecture" className="space-y-6 pt-4">
          <div className="border-b border-cyber-700/60 pb-3 flex items-center space-x-2">
            <Server className="w-5 h-5 text-cyber-accent" />
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">System Architecture & Limitations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tech Stack */}
            <div className="glass-card rounded-2xl p-6 border border-cyber-700/60 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span>Production Technology Stack</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-cyber-900 border border-cyber-700/60">
                  <span className="text-slate-400 block">Frontend</span>
                  <span className="font-semibold text-white">React 18 + Vite</span>
                </div>
                <div className="p-3 rounded-lg bg-cyber-900 border border-cyber-700/60">
                  <span className="text-slate-400 block">Styling</span>
                  <span className="font-semibold text-white">Tailwind CSS (Cyber UI)</span>
                </div>
                <div className="p-3 rounded-lg bg-cyber-900 border border-cyber-700/60">
                  <span className="text-slate-400 block">Backend API</span>
                  <span className="font-semibold text-white">FastAPI (Python 3)</span>
                </div>
                <div className="p-3 rounded-lg bg-cyber-900 border border-cyber-700/60">
                  <span className="text-slate-400 block">ML Engine</span>
                  <span className="font-semibold text-white">Scikit-learn 1.6.1 + Joblib</span>
                </div>
                <div className="p-3 rounded-lg bg-cyber-900 border border-cyber-700/60">
                  <span className="text-slate-400 block">Deployment</span>
                  <span className="font-semibold text-white">Render Cloud Platform</span>
                </div>
                <div className="p-3 rounded-lg bg-cyber-900 border border-cyber-700/60">
                  <span className="text-slate-400 block">Inference Speed</span>
                  <span className="font-semibold text-emerald-400 font-mono">&lt; 10 ms / URL</span>
                </div>
              </div>
            </div>

            {/* Model Limitations */}
            <div className="glass-card rounded-2xl p-6 border border-cyber-700/60 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Model Scope & Limitations</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                <li>
                  <span className="text-white font-medium">Lexical Analysis Only:</span> Analyzes string syntax and
                  keywords; does not inspect DNS records, domain WHOIS age, or web page content.
                </li>
                <li>
                  <span className="text-white font-medium">Distributional Bias:</span> Historical training datasets
                  exhibit specific protocol distributions (such as unencrypted prefixes or length clusters) that may
                  differ from modern attacker hosting habits.
                </li>
                <li>
                  <span className="text-white font-medium">Zero-Day Attacks:</span> Malicious domains registered with
                  clean lexical names and SSL certificates may bypass purely syntactic classifiers.
                </li>
                <li>
                  <span className="text-white font-medium">Defense in Depth:</span> Recommended for use as a fast,
                  low-latency pre-filter alongside blacklists, certificate validation, and browser sandboxing.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-cyber-700/60 bg-cyber-950/80 py-6 text-center text-xs text-slate-400 space-y-2">
        <p className="font-medium text-slate-400">
          Malicious URL Detection Using Ensemble Learning &bull; Academic Project
        </p>
        <p className="text-slate-400">
          Powered by FastAPI &bull; Scikit-learn Random Forest &bull; React &bull; Deployed on Render
        </p>
      </footer>
    </div>
  );
}

