import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Play,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  List,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import MonacoEditor from '../../components/CodeEditor/MonacoEditor';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import gsap from 'gsap';
import axios from 'axios';
import alasql from 'alasql';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Suppress ResizeObserver noise
const useSupressResizeObserverErrors = () => {
  useEffect(() => {
    const originalConsoleError = console.error;
    const handleError = (event) => {
      const msg = event.message || event.error?.message || '';
      const stack = event.error?.stack || '';
      if (msg.includes('ResizeObserver') || stack.includes('ResizeObserver')) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    };
    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      const s = typeof reason === 'string'
        ? reason
        : reason?.message
        ? reason.message
        : reason?.toString
        ? reason.toString()
        : '';
      if (s.includes('ResizeObserver')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };
    console.error = (...args) => {
      const s = args.join(' ');
      if (s.includes('ResizeObserver')) return;
      originalConsoleError.apply(console, args);
    };
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      console.error = originalConsoleError;
    };
  }, []);
};

// Responsive JsonTable with union-of-keys columns
const JsonTable = ({ data }) => {
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) {
    return (
      <div className="p-2 text-sm text-gray-400 border border-gray-600 rounded">
        No data to display
      </div>
    );
  }
  const keySet = new Set();
  rows.forEach((r) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      Object.keys(r).forEach((k) => keySet.add(k));
    }
  });
  const stableColumns = Array.from(keySet);
  if (stableColumns.length === 0) {
    return (
      <div className="p-2 text-sm text-gray-400 border border-gray-600 rounded">
        No object fields to show
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded max-h-64 sm:max-h-80 md:max-h-96">
      <table className="w-full border border-gray-600 rounded-lg table-fixed">
        <thead className="bg-gray-700">
          <tr>
            {stableColumns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-xs font-medium text-left text-gray-200 break-words border-b border-gray-600"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
              {stableColumns.map((col) => {
                const v = row && typeof row === 'object' ? row[col] : undefined;
                return (
                  <td
                    key={col}
                    className="px-3 py-2 text-xs text-gray-300 break-words whitespace-normal align-top border-b border-gray-700"
                  >
                    {v === null || v === undefined
                      ? ''
                      : typeof v === 'object'
                      ? JSON.stringify(v)
                      : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Code execution
class CodeExecutionEngine {
  static PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';
  static TIMEOUT = 20000;

  static async executePython(code, testCases) {
    const results = [];
    for (let i = 0; i < testCases.length; i++) {
      const t = testCases[i];
      try {
        const start = Date.now();
        const resp = await axios.post(this.PISTON_API_URL, {
          language: 'python',
          version: '3.10.0',
          files: [{ name: 'main.py', content: code }],
          stdin: t.input || '',
          compile_timeout: 10000,
          run_timeout: 10000,
        }, { timeout: this.TIMEOUT, headers: { 'Content-Type': 'application/json' } });
        const ms = Date.now() - start;
        const run = resp.data?.run || {};
        const stdout = run.stdout || '';
        const stderr = run.stderr || '';
        const codeExit = run.code !== undefined ? run.code : 1;
        const testResult = {
          input: t.input || "",
          expected: t.expectedOutput,
          actual: stdout.trim(),
          passed: false,
          executionTime: ms,
          error: null,
        };
        if (codeExit === 0) {
          const actual = stdout.trim();
          const expected = (t.expectedOutput || "").trim();
          testResult.passed = actual === expected;
          if (!testResult.passed) {
            testResult.error = `Expected: "${expected}", Got: "${actual}"`;
          }
        } else {
          testResult.error = `Runtime Error: ${stderr || 'Unknown error'}`;
        }
        results.push(testResult);
      } catch (e) {
        results.push({
          input: t.input || "",
          expected: t.expectedOutput,
          actual: "",
          passed: false,
          executionTime: 0,
          error: `API Error: ${e.message}`,
        });
      }
    }
    return results;
  }

  static async executeJava(code, testCases) {
    const results = [];
    for (let i = 0; i < testCases.length; i++) {
      const t = testCases[i];
      try {
        const start = Date.now();
        const resp = await axios.post(this.PISTON_API_URL, {
          language: 'java',
          version: '15.0.2',
          files: [{ name: 'Main.java', content: code }],
          stdin: t.input || '',
          compile_timeout: 10000,
          run_timeout: 10000,
        }, { timeout: this.TIMEOUT, headers: { 'Content-Type': 'application/json' } });
        const ms = Date.now() - start;
        const run = resp.data?.run || {};
        const cmp = resp.data?.compile || {};
        const stdout = run.stdout || '';
  
        const stderr = run.stderr || '';
        const compileStderr = cmp.stderr || '';
        const codeExit = run.code !== undefined ? run.code : 1;
        const testResult = {
          input: t.input || "",
          expected: t.expectedOutput,
          actual: stdout.trim(),
          passed: false,
          executionTime: ms,
          error: null,
        };
        if (compileStderr) {
          testResult.error = `Compilation Error: ${compileStderr}`;
        } else if (codeExit === 0) {
          const actual = stdout.trim();
          const expected = (t.expectedOutput || "").trim();
          testResult.passed = actual === expected;
          if (!testResult.passed) {
            testResult.error = `Expected: "${expected}", Got: "${actual}"`;
          }
        } else {
          testResult.error = `Runtime Error: ${stderr || 'Unknown error'}`;
        }
        results.push(testResult);
      } catch (e) {
        results.push({
          input: t.input || "",
          expected: t.expectedOutput,
          actual: "",
          passed: false,
          executionTime: 0,
          error: `API Error: ${e.message}`,
        });
      }
    }
    return results;
  }

  static normalizeSQLForAlaSQL(sql) {
    if (!sql || typeof sql !== 'string') return sql || '';
    let out = sql.replace(/\bINTEGER\s+PRIMARY\s+KEY\b/gi, 'INT AUTOINCREMENT PRIMARY KEY');
    out = out.replace(/\bINT\s+PRIMARY\s+KEY\b/gi, 'INT AUTOINCREMENT PRIMARY KEY');
    return out;
  }

  static async executeSQL(sqlQuery, testCases) {
    const results = [];
    try {
      for (let i = 0; i < testCases.length; i++) {
        const t = testCases[i];
        try {
          const start = Date.now();
          const dbi = new alasql.Database();
          if (t.input && t.input.trim()) {
            const normalized = this.normalizeSQLForAlaSQL(t.input.trim());
            const createMatches = normalized.match(/CREATE\s+TABLE\s+([`"']?)(\w+)\1/gi) || [];
            createMatches.forEach(stmt => {
              const m = stmt.match(/CREATE\s+TABLE\s+[`"']?(\w+)[`"']?/i);
              if (m && m[1]) {
                try { dbi.exec(`DROP TABLE IF EXISTS ${m[1]}`); } catch (_) {}
              }
            });
            const parts = normalized.split(';').map(s => s.trim()).filter(Boolean);
            for (const q of parts) dbi.exec(q);
          }
          const queryResult = dbi.exec(sqlQuery);
          const ms = Date.now() - start;
          const actualOutput = (queryResult && queryResult.length > 0) ? JSON.stringify(queryResult) : '[]';
          const expected = (t.expectedOutput || "").trim();
          const passed = expected === actualOutput.trim();
          results.push({
            input: t.input || "",
            expected: t.expectedOutput,
            actual: actualOutput,
            passed,
            executionTime: ms,
            error: passed ? null : `Expected: "${expected}", Got: "${actualOutput}"`
          });
        } catch (e) {
          results.push({
            input: t.input || "",
            expected: t.expectedOutput,
            actual: "",
            passed: false,
            executionTime: 0,
            error: `SQL Error: ${e.message}`,
          });
        }
      }
    } catch (e) {
      return testCases.map(t => ({
        input: t.input || "",
        expected: t.expectedOutput,
        actual: "",
        passed: false,
        executionTime: 0,
        error: `SQL Engine Error: ${e.message}`,
      }));
    }
    return results;
  }

  static async executeCode(code, language, testCases) {
    let results = [];
    switch (language.toLowerCase()) {
      case 'python': results = await this.executePython(code, testCases); break;
      case 'java': results = await this.executeJava(code, testCases); break;
      case 'sql': results = await this.executeSQL(code, testCases); break;
      default: throw new Error(`Unsupported language: ${language}`);
    }
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    return {
      testCases: results,
      score,
      totalTests,
      passedTests,
      status: passedTests === totalTests ? "accepted" : "wrong_answer"
    };
  }
}

const TestCaseOutput = ({ testCase, index, language }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const parseJsonMaybe = (s) => {
    if (!s) return null;
    if (typeof s === 'object') return s;
    if (typeof s === 'string') {
      try { return JSON.parse(s); } catch { return s; }
    }
    return s;
  };

  const renderOutput = (output) => {
    if (!output && output !== 0 && output !== '') {
      return <div className="text-sm text-gray-400">No output</div>;
    }
    if (language === 'sql') {
      const parsed = parseJsonMaybe(output);
      if (Array.isArray(parsed)) return <JsonTable data={parsed} />;
      if (parsed && typeof parsed === 'object') return <JsonTable data={[parsed]} />;
    }
    const display = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);
    return (
      <pre className="p-2 overflow-auto text-xs text-gray-300 break-words whitespace-pre-wrap bg-gray-800 border rounded max-h-48">
        {display}
      </pre>
    );
  };

  const isPassed = !!testCase.passed;

  return (
    <div className={`border rounded-lg mb-3 ${isPassed ? 'border-green-600' : 'border-red-600'}`}>
      <div
        className={`p-3 cursor-pointer flex items-center justify-between ${
          isPassed ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isPassed ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-medium">Test Case {index + 1}</span>
          <span className={`text-sm px-2 py-1 rounded ${
            isPassed ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
          }`}>
            {isPassed ? 'PASSED' : 'FAILED'}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-600">
          {testCase.input && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-300">Input:</h4>
              <pre className="p-2 overflow-auto text-xs text-gray-300 break-words whitespace-pre-wrap bg-gray-800 border rounded max-h-48">
                {testCase.input}
              </pre>
            </div>
          )}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Expected Output:</h4>
            <div className="p-3 bg-gray-900 border rounded">
              {renderOutput(testCase.expected)}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Actual Output:</h4>
            <div className={`p-3 rounded border ${isPassed ? 'bg-gray-900' : 'bg-red-900 bg-opacity-10 border-red-600'}`}>
              {renderOutput(testCase.actual)}
            </div>
          </div>
          {testCase.error && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-red-400">Error:</h4>
              <pre className="p-2 overflow-auto text-xs text-red-300 break-words whitespace-pre-wrap bg-red-900 border border-red-600 rounded max-h-48 bg-opacity-20">
                {testCase.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TestResultsDisplay = ({ testResults, language }) => {
  if (!testResults || !testResults.testCases || testResults.testCases.length === 0) return null;
  const { passedTests, totalTests, score, testCases } = testResults;
  return (
    <div className="min-w-0 p-4 mt-4 bg-gray-800 border border-gray-600 rounded-lg">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-600">
        <h3 className="text-lg font-semibold text-white">Test Results</h3>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-300">
            Passed: <span className="font-medium text-green-400">{passedTests}</span> / {totalTests}
          </span>
          <span className="text-sm text-gray-300">
            Score: <span className="font-medium text-blue-400">{score}%</span>
          </span>
        </div>
      </div>
      <div className="mb-4">
        <div className="w-full h-2 bg-gray-700 rounded-full">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              score === 100 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <div className="pr-1 space-y-3 overflow-y-auto max-h-96">
        <h4 className="mb-3 font-medium text-gray-200 text-md">Test Case Details:</h4>
        {testCases.map((tc, idx) => (
          <TestCaseOutput key={idx} testCase={tc} index={idx} language={language} />
        ))}
      </div>
    </div>
  );
};

const CodeEditor = () => {
  const { assessmentId, questionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useSupressResizeObserverErrors();

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [submissions, setSubmissions] = useState({});
  const [isFromCache, setIsFromCache] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [assessmentReview, setAssessmentReview] = useState(null);
  const reviewRef = useRef(null);

  const timerRef = useRef(null);
  const cacheKeyRef = useRef(null);
  const lastSaveRef = useRef(Date.now());

  const handleCopy = useCallback((e) => { e.preventDefault(); toast.error('Copy operation is disabled during assessment'); return false; }, []);
  const handlePaste = useCallback((e) => { e.preventDefault(); toast.error('Paste operation is disabled during assessment'); return false; }, []);
  const handleCut = useCallback((e) => { e.preventDefault(); toast.error('Cut operation is disabled during assessment'); return false; }, []);

  const getCacheKey = useCallback((aId, qId, uId) => `codeEditor_${aId}_${qId}_${uId}`, []);
  const getCacheData = useCallback((key) => { try { const c = localStorage.getItem(key); return c ? JSON.parse(c) : null; } catch { return null; } }, []);
  const setCacheData = useCallback((key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); lastSaveRef.current = Date.now(); } catch {} }, []);
  const clearCacheData = useCallback((key) => { try { localStorage.removeItem(key); } catch {} }, []);

  const saveToCache = useCallback(() => {
    if (!cacheKeyRef.current || !currentQuestion) return;
    const payload = { code, timeRemaining, sessionStartTime, questionId, lastSaved: Date.now(), testResults };
    setCacheData(cacheKeyRef.current, payload);
  }, [code, timeRemaining, sessionStartTime, questionId, testResults, setCacheData, currentQuestion]);

  const loadFromCache = useCallback(() => {
    if (!cacheKeyRef.current) return null;
    const cached = getCacheData(cacheKeyRef.current);
    if (!cached) return null;
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - cached.lastSaved > maxAge) {
      clearCacheData(cacheKeyRef.current);
      return null;
    }
    return cached;
  }, [getCacheData, clearCacheData]);

  const debouncedSaveToCache = useCallback(() => {
    if (Date.now() - lastSaveRef.current > 2000) saveToCache();
  }, [saveToCache]);

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const next = prev - 1;
          if (next % 10 === 0) setTimeout(saveToCache, 100);
          if (next <= 0) { handleTimeUp(); return 0; }
          return next;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [timeRemaining, saveToCache]);

  useEffect(() => { if (code && currentQuestion) debouncedSaveToCache(); }, [code, currentQuestion, debouncedSaveToCache]);

  useEffect(() => {
    loadAssessmentData();
    gsap.timeline()
      .fromTo('.editor-header', { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' })
      .fromTo('.editor-content', { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.4');
  }, [assessmentId]);

  useEffect(() => {
    if (questions.length > 0 && questionId && user) {
      const idx = questions.findIndex(q => q.id === questionId);
      if (idx >= 0) {
        const qn = questions[idx];
        if (!qn.language) { toast.error('Question configuration error: missing language'); return; }
        setCurrentQuestionIndex(idx);
        setCurrentQuestion(qn);
        cacheKeyRef.current = getCacheKey(assessmentId, questionId, user.uid);
        const cached = loadFromCache();
        if (cached && cached.questionId === questionId) {
          setCode(cached.code || qn.starterCode || getDefaultCode(qn.language));
          setTimeRemaining(cached.timeRemaining);
          setSessionStartTime(cached.sessionStartTime);
          setTestResults(cached.testResults || null);
          setIsFromCache(true);
          toast.success('🔄 Session restored from cache', { duration: 2000 });
        } else {
          setCode(qn.starterCode || getDefaultCode(qn.language));
          setTestResults(null);
          setIsFromCache(false);
        }
      }
    }
  }, [questionId, questions, user, assessmentId, getCacheKey, loadFromCache]);

  const getDefaultCode = (language) => {
    const defaults = {
      python: 'print("Hello World")',
      java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
      javascript: 'console.log("Hello World");',
      sql: 'SELECT "Hello World" AS message;',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}'
    };
    return defaults[language] || '';
    };

  const renderSampleOutput = (output, language) => {
    if (!output) return null;
    if (language === 'sql') {
      try {
        const parsed = JSON.parse(output);
        if (Array.isArray(parsed)) return <JsonTable data={parsed} />;
      } catch {}
    }
    return (
      <pre className="p-3 overflow-auto text-sm break-words whitespace-pre-wrap bg-gray-700 rounded-lg max-h-48">
        {output}
      </pre>
    );
  };

  const loadAssessmentData = async () => {
    try {
      setLoading(true);
      const aDoc = await getDoc(doc(db, 'assessments', assessmentId));
      if (!aDoc.exists()) {
        toast.error('Assessment not found');
        navigate('/');
        return;
      }
      const aData = { id: aDoc.id, ...aDoc.data() };
      setAssessment(aData);
      if (!isFromCache) {
        const initial = aData.timeLimit * 60;
        setTimeRemaining(initial);
        setSessionStartTime(Date.now());
      }
      if (aData.questions && aData.questions.length > 0) {
        const qDocs = await Promise.all(aData.questions.map(qId => getDoc(doc(db, 'questions', qId))));
        const qData = qDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
        setQuestions(qData);
        if (questionId) {
          const idx = qData.findIndex(q => q.id === questionId);
          if (idx >= 0) {
            setCurrentQuestionIndex(idx);
            setCurrentQuestion(qData[idx]);
          }
        } else if (qData.length > 0) {
          // fix default navigate
          navigate(`/code/${assessmentId}/${qData.id}`, { replace: true });
        }
      }
      if (!user) return;
      const subSnap = await getDocs(
        query(
          collection(db, 'submissions'),
          where('userId', '==', user.uid),
          where('assessmentId', '==', assessmentId)
        )
      );
      const subs = {};
      subSnap.forEach(d => {
        const s = d.data();
        subs[s.questionId] = { ...s, submissionId: d.id };
      });
      setSubmissions(subs);
    } catch {
      toast.error('Failed to load assessment');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (v) => setCode(v || '');

  const handleRunCode = async () => {
    if (!code || !code.trim()) { toast.error('Please write some code first'); return; }
    if (!currentQuestion?.language) { toast.error('Programming language not specified'); return; }
    if (!currentQuestion?.testCases || currentQuestion.testCases.length === 0) { toast.error('No test cases available for this question'); return; }
    setRunning(true);
    try {
      const result = await CodeExecutionEngine.executeCode(code.trim(), currentQuestion.language, currentQuestion.testCases);
      setTestResults(result);
      saveToCache();
      if (result.passedTests === result.totalTests) {
        toast.success(`🎉 All ${result.totalTests} test cases passed! Score: ${result.score}%`);
      } else {
        toast.success(`${result.passedTests}/${result.totalTests} test cases passed. Score: ${result.score}%`);
      }
    } catch (e) {
      toast.error(`Code execution failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Build equal-weight review (100/totalQuestions) and include per-question exec sum
  const buildAssessmentReview = (latestSubForCurrent) => {
    const totalQuestions = questions.length || 0;
    const weight = totalQuestions > 0 ? Math.round(100 / totalQuestions) : 0;
    const items = questions.map((q) => {
      const sub = q.id === latestSubForCurrent?.questionId ? latestSubForCurrent : submissions[q.id];
      const status = (sub?.status || sub?.testResults?.status || '').toLowerCase();
      const passedTests = sub?.passedTests ?? sub?.testResults?.passedTests ?? 0;
      const totalTests = sub?.totalTests ?? sub?.testResults?.totalTests ?? (q?.testCases?.length ?? 0);
      const tcs = sub?.testCasesResults || sub?.testResults?.testCases || [];
      const executionTimeMs = Array.isArray(tcs) ? tcs.reduce((acc, t) => acc + (t?.executionTime || 0), 0) : 0;
      const earnedPoints = status === 'accepted' ? weight : 0;
      return {
        questionId: q.id,
        title: q.title,
        status,
        passedTests,
        totalTests,
        earnedPoints,
        executionTimeMs,
        timeSpent: sub?.timeSpent || null,
        code: sub?.code || '',
      };
    });
    const completedCount = items.filter(i => i.status === 'accepted').length;
    const totalScore = items.reduce((acc, i) => acc + (i.earnedPoints || 0), 0);
    return { totalQuestions, completedCount, totalScore, items };
  };

  const handleSubmitSolution = async () => {
    if (!testResults) { toast.error('Please run your code first'); return; }
    setSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
      const subData = {
        userId: user.uid,
        assessmentId,
        questionId: currentQuestion.id,
        code,
        language: currentQuestion.language,
        status: testResults.status || "completed",
        score: testResults.score || 0,
        maxScore: 100,
        testCasesResults: testResults.testCases || [],
        passedTests: testResults.passedTests || 0,
        totalTests: testResults.totalTests || 0,
        timeSpent,
        submittedAt: new Date(),
        createdAt: new Date()
      };
      const subRef = await addDoc(collection(db, 'submissions'), subData);

      if (cacheKeyRef.current) clearCacheData(cacheKeyRef.current);

      setSubmissions((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          ...subData,
          submissionId: subRef.id,
          completed: true
        }
      }));
      toast.success(`Solution submitted! Score: ${testResults.score}%`);

      if (currentQuestionIndex < questions.length - 1) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        navigate(`/code/${assessmentId}/${nextQuestion.id}`);
      } else {
        questions.forEach(q => {
          const key = getCacheKey(assessmentId, q.id, user.uid);
          clearCacheData(key);
        });
        const review = buildAssessmentReview({ ...subData, testResults });
        try {
          await addDoc(collection(db, 'assessmentReviews'), {
            userId: user.uid,
            assessmentId,
            title: assessment?.title || '',
            createdAt: new Date(),
            ...review
          });
          await setDoc(
            doc(db, 'userAssessments', `${user.uid}_${assessmentId}`),
            {
              userId: user.uid,
              assessmentId,
              status: 'completed',
              totalScore: review.totalScore,
              completedAt: new Date(),
              totalQuestions: review.totalQuestions,
              completedCount: review.completedCount,
            },
            { merge: true }
          );
        } catch {}
        setAssessmentReview(review);
        setShowReview(true);
        toast.success('Assessment completed! Review generated.');
      }
    } catch (e) {
      toast.error('Failed to submit solution: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuestionChange = (idx) => {
    saveToCache();
    const q = questions[idx];
    navigate(`/code/${assessmentId}/${q.id}`);
  };

  const handleTimeUp = () => {
    if (cacheKeyRef.current) clearCacheData(cacheKeyRef.current);
    toast.error('Time\'s up! Assessment ended.');
    navigate('/dashboard');
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!timeRemaining) return 'text-gray-600';
    const pct = (timeRemaining / (assessment?.timeLimit * 60)) * 100;
    if (pct > 50) return 'text-green-600';
    if (pct > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const resetCode = () => {
    const reset = currentQuestion?.starterCode || getDefaultCode(currentQuestion?.language);
    setCode(reset);
    setTestResults(null);
    saveToCache();
    toast.success('Code reset');
  };

  const saveProgress = () => { saveToCache(); toast.success('Progress saved'); };

  const restartSession = () => {
    if (cacheKeyRef.current) clearCacheData(cacheKeyRef.current);
    setCode(currentQuestion?.starterCode || getDefaultCode(currentQuestion?.language));
    setTestResults(null);
    setTimeRemaining(assessment?.timeLimit * 60);
    setSessionStartTime(Date.now());
    setIsFromCache(false);
    toast.success('Session restarted');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      saveToCache();
    };
  }, [saveToCache]);

  // Compute average execution ms helper
  const computeAvgExecMs = (review) => {
    if (!review || !Array.isArray(review.items) || review.items.length === 0) return 0;
    // Use all attempted questions; alternatively filter only accepted:
    const considered = review.items.filter(() => true);
    const sum = considered.reduce((acc, it) => acc + (Number(it.executionTimeMs) || 0), 0);
    const avg = considered.length > 0 ? Math.round(sum / considered.length) : 0;
    return avg;
  };

  // Cleanup submissions and keep only assessmentsCompleted object { score, avgExecMs, completedAt }
  const cleanupSubmissionsAndPersistScore = async (totalScore) => {
    try {
      // 1) Delete all submissions for this user+assessment
      const snap = await getDocs(
        query(
          collection(db, 'submissions'),
          where('userId', '==', user.uid),
          where('assessmentId', '==', assessmentId)
        )
      );
      let batch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        if (count % 450 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      await batch.commit();

      // 2) Build payload for assessmentsCompleted.{assessmentId}
      const review = assessmentReview || { items: [], totalScore: totalScore || 0 };
      const avgExecMs = computeAvgExecMs(review);
      const completedAt = new Date();
      const payload = {
        score: review.totalScore ?? totalScore ?? 0,
        avgExecMs,
        completedAt
      };

      // 3) Update user map
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [`assessmentsCompleted.${assessmentId}`]: payload
      });

      toast.success('Saved score and cleaned up submissions');
    } catch (e) {
      toast.error('Cleanup failed: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <LoadingSpinner size="xl" text="Loading assessment..." />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold">Question Not Found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gray-900 text-white flex min-w-0 min-h-0`}>
      {/* Sidebar */}
      {showSidebar && (
        <div className="flex flex-col min-w-0 bg-gray-800 border-r border-gray-700 w-80">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold truncate">{assessment?.title}</h2>
            <p className="text-sm text-gray-400">{questions.length} Questions</p>
            {isFromCache && (
              <div className="flex items-center mt-2 text-xs text-green-400">
                <RefreshCw className="w-3 h-3 mr-1" />
                Session restored from cache
              </div>
            )}
            <div className="flex items-center mt-2 text-xs text-blue-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Client-side execution (Piston API + AlaSQL)
            </div>
          </div>

          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Time Remaining</span>
              <div className={`text-xl font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4">
              <h3 className="mb-3 font-semibold">Questions</h3>
              <div className="space-y-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isSubmitted = submissions[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionChange(idx)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Q{idx + 1}</span>
                        {isSubmitted && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                      <p className="mt-1 text-sm truncate opacity-80">{q.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          q.difficulty === 'easy' ? 'bg-green-600' :
                          q.difficulty === 'medium' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-gray-400">{q.marks} pts</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gray-800 border-b border-gray-700 editor-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-700"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center min-w-0 space-x-3">
                  <h1 className="text-xl font-bold truncate">
                    Q{currentQuestionIndex + 1}: {currentQuestion.title}
                  </h1>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>{currentQuestion.language?.toUpperCase()}</span>
                  <span>{currentQuestion.marks} points</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-600' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-600">Frontend Execution</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={saveProgress} className="p-2 transition-colors rounded-lg hover:bg-gray-700" title="Save Progress">
                <Save className="w-5 h-5" />
              </button>
              <button onClick={resetCode} className="p-2 transition-colors rounded-lg hover:bg-gray-700" title="Reset Code">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={restartSession} className="p-2 transition-colors rounded-lg hover:bg-gray-700" title="Restart Session">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 transition-colors rounded-lg hover:bg-gray-700"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-w-0 min-h-0 editor-content">
          {/* Problem */}
          <div className="max-w-full min-w-0 overflow-y-auto bg-gray-800 border-r border-gray-700 basis-1/3 shrink-0">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-bold">Problem Description</h2>
              <div className="prose prose-invert max-w-none">
                <div className="leading-relaxed text-gray-300 break-words whitespace-pre-wrap">
                  {currentQuestion.description}
                </div>
                {currentQuestion.sampleInput && (
                  <div className="mt-6">
                    <h3 className="mb-2 text-lg font-semibold text-white">Sample Input</h3>
                    <pre className="p-3 overflow-auto text-sm break-words whitespace-pre-wrap bg-gray-700 rounded-lg max-h-48">
                      {currentQuestion.sampleInput}
                    </pre>
                  </div>
                )}
                {currentQuestion.sampleOutput && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">Sample Output</h3>
                    {renderSampleOutput(currentQuestion.sampleOutput, currentQuestion.language)}
                  </div>
                )}
                {currentQuestion.constraints && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">Constraints</h3>
                    <div className="text-sm text-gray-300 break-words whitespace-pre-wrap">
                      {currentQuestion.constraints}
                    </div>
                  </div>
                )}
                {currentQuestion.hints && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">Hints</h3>
                    <div className="text-sm text-gray-300 break-words whitespace-pre-wrap">
                      {currentQuestion.hints}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor + Results */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <div className="flex-1 min-w-0 min-h-0">
              <MonacoEditor
                language={currentQuestion.language}
                value={code}
                onChange={handleCodeChange}
                onRunCode={handleRunCode}
                onSubmitCode={handleSubmitSolution}
                isRunning={running || submitting}
                testResults={testResults?.results}
                theme="vs-dark"
                onCopy={handleCopy}
                onPaste={handlePaste}
                onCut={handleCut}
              />
            </div>
            <div className="min-w-0 bg-gray-800 border-t border-gray-700">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleRunCode}
                      disabled={running}
                      className="flex items-center px-6 py-2 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-600"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {running ? 'Running...' : 'Run Code'}
                    </button>
                    <button
                      onClick={handleSubmitSolution}
                      disabled={submitting || !testResults}
                      className="flex items-center px-6 py-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? 'Submitting...' : 'Submit Solution'}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => currentQuestionIndex > 0 && handleQuestionChange(currentQuestionIndex - 1)}
                      disabled={currentQuestionIndex === 0}
                      className="p-2 transition-colors rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="px-3 text-sm text-gray-400">
                      {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <button
                      onClick={() => currentQuestionIndex < questions.length - 1 && handleQuestionChange(currentQuestionIndex + 1)}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="p-2 transition-colors rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center p-3 mt-4 space-x-2 text-purple-400 bg-purple-900 rounded-lg bg-opacity-20">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Code execution: Python/Java via Piston API, SQL via AlaSQL (no WASM issues)
                  </span>
                </div>
              </div>
              <div className="min-w-0 overflow-y-auto max-h-96">
                <TestResultsDisplay testResults={testResults} language={currentQuestion.language} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Review Modal */}
      {showReview && assessmentReview && (
        <div className="fixed inset-0 z-[4] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl overflow-hidden bg-gray-800 border border-gray-700 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Assessment Review</h3>
              <button onClick={() => setShowReview(false)} className="p-2 rounded hover:bg-gray-700">✕</button>
            </div>

            <div ref={reviewRef} className="px-5 py-4 space-y-4 overflow-auto max-h-[70vh] min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-400">Assessment</p>
                  <p className="font-semibold">{assessment?.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="font-semibold">
                    {assessmentReview.completedCount}/{assessmentReview.totalQuestions} questions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Score</p>
                  <p className="text-2xl font-bold">{assessmentReview.totalScore}/100</p>
                </div>
              </div>

              <div className="space-y-3">
                {assessmentReview.items.map((it, idx) => (
                  <div key={it.questionId || idx} className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-400">Q{idx + 1}</p>
                        <p className="font-semibold truncate">{it.title || it.questionId}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        (it.status || '').toLowerCase() === 'accepted' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {(it.status || '').replace('_', ' ') || 'Unknown'}
                      </span>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Tests</p>
                        <p className="font-semibold">{it.passedTests}/{it.totalTests}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Points</p>
                        <p className="font-semibold">{it.earnedPoints}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Time</p>
                        <p className="font-semibold">
                          {it.executionTimeMs ? `${it.executionTimeMs} ms` : it.timeSpent ? `${it.timeSpent}s` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="mb-1 text-sm text-gray-400">Submitted Code</p>
                      <pre className="p-3 overflow-auto text-xs text-green-300 break-words whitespace-pre-wrap bg-gray-800 border border-gray-700 rounded max-h-48">
                        {it.code || 'No code'}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
              <button
                onClick={async () => {
                  const node = reviewRef.current;
                  if (!node) return;
                  const canvas = await html2canvas(node, { scale: 2, useCORS: true });
                  const img = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'pt', 'a4');
                  const pageW = pdf.internal.pageSize.getWidth();
                  const pageH = pdf.internal.pageSize.getHeight();
                  const imgProps = pdf.getImageProperties(img);
                  const ratio = Math.min(pageW / imgProps.width, pageH / imgProps.height);
                  const w = imgProps.width * ratio;
                  const h = imgProps.height * ratio;
                  pdf.addImage(img, 'PNG', (pageW - w) / 2, 24, w, h);
                  pdf.save(`${assessment?.title || 'assessment'}-review.pdf`);
                  // After exporting, cleanup and persist score object
                  await cleanupSubmissionsAndPersistScore(assessmentReview.totalScore);
                }}
                className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
              >
                Download PDF
              </button>
              <div className="space-x-2">
                <button onClick={() => setShowReview(false)} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                  Close
                </button>
                <button
                  onClick={async () => {
                    await cleanupSubmissionsAndPersistScore(assessmentReview.totalScore);
                    navigate('/dashboard');
                  }}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
