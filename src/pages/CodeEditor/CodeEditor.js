import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
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

// ✅ Enhanced ResizeObserver error suppression hook
const useSupressResizeObserverErrors = () => {
  useEffect(() => {
    // Store original console.error to restore later if needed
    const originalConsoleError = console.error;
    
    // Enhanced error handler for window errors
    const handleError = (event) => {
      const errorMessage = event.message || event.error?.message || '';
      const errorStack = event.error?.stack || '';
      
      // Check for ResizeObserver related errors
      if (
        errorMessage.includes('ResizeObserver loop') ||
        errorMessage.includes('ResizeObserver loop limit exceeded') ||
        errorMessage.includes('ResizeObserver loop completed with undelivered notifications') ||
        errorMessage.includes('ResizeObserver') ||
        errorStack.includes('ResizeObserver')
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    };

    // Enhanced unhandled rejection handler
    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      let reasonString = '';
      
      if (typeof reason === 'string') {
        reasonString = reason;
      } else if (reason?.message) {
        reasonString = reason.message;
      } else if (reason?.toString) {
        reasonString = reason.toString();
      }
      
      if (reasonString.includes('ResizeObserver')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // Override console.error to suppress ResizeObserver console errors
    console.error = (...args) => {
      const errorString = args.join(' ');
      if (
        errorString.includes('ResizeObserver loop') ||
        errorString.includes('ResizeObserver loop limit exceeded') ||
        errorString.includes('ResizeObserver loop completed with undelivered notifications') ||
        errorString.includes('ResizeObserver')
      ) {
        // Suppress ResizeObserver errors
        return;
      }
      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };

    // Add event listeners
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      // Restore original console.error
      console.error = originalConsoleError;
    };
  }, []);
};

// ✅ Component to render JSON data as table
const JsonTable = ({ data, label }) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="p-2 text-sm text-gray-400 border border-gray-600 rounded">
        No data to display
      </div>
    );
  }

  const tableData = Array.isArray(data) ? data : [data];
  
  if (tableData.length === 0) {
    return (
      <div className="p-2 text-sm text-gray-400 border border-gray-600 rounded">
        Empty result set
      </div>
    );
  }

  const columns = Object.keys(tableData[0]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-600 rounded-lg">
        <thead className="bg-gray-700">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-3 py-2 text-xs font-medium text-left text-gray-200 border-b border-gray-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-3 py-2 text-xs text-gray-300 border-b border-gray-700">
                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ✅ Fixed client-side code execution engine
class CodeExecutionEngine {
  static PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';
  static TIMEOUT = 20000;

  // ✅ Execute Python code with proper error handling
  static async executePython(code, testCases) {
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        const startTime = Date.now();

        const response = await axios.post(this.PISTON_API_URL, {
          language: 'python',
          version: '3.10.0',
          files: [{
            name: 'main.py',
            content: code,
          }],
          stdin: testCase.input || '',
          compile_timeout: 10000,
          run_timeout: 10000,
        }, {
          timeout: this.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const executionTime = Date.now() - startTime;

        // ✅ Safe access to response properties
        const runData = response.data?.run || {};
        const stdout = runData.stdout || '';
        const stderr = runData.stderr || '';
        const exitCode = runData.code !== undefined ? runData.code : 1;

        const testResult = {
          input: testCase.input || "",
          expected: testCase.expectedOutput,
          actual: stdout.trim(),
          passed: false,
          executionTime,
          error: null,
        };

        if (exitCode === 0) {
          const actualOutput = stdout.trim();
          const expectedOutput = (testCase.expectedOutput || "").trim();
          testResult.passed = actualOutput === expectedOutput;

          if (!testResult.passed) {
            testResult.error = `Expected: "${expectedOutput}", Got: "${actualOutput}"`;
          }
        } else {
          testResult.error = `Runtime Error: ${stderr || 'Unknown error'}`;
        }

        results.push(testResult);
      } catch (error) {
        console.error(`❌ Python test case ${i + 1} error:`, error);
        results.push({
          input: testCase.input || "",
          expected: testCase.expectedOutput,
          actual: "",
          passed: false,
          executionTime: 0,
          error: `API Error: ${error.message}`,
        });
      }
    }

    return results;
  }

  // ✅ Execute Java code with proper error handling
  static async executeJava(code, testCases) {
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        const startTime = Date.now();

        const response = await axios.post(this.PISTON_API_URL, {
          language: 'java',
          version: '15.0.2',
          files: [{
            name: 'Main.java',
            content: code,
          }],
          stdin: testCase.input || '',
          compile_timeout: 10000,
          run_timeout: 10000,
        }, {
          timeout: this.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const executionTime = Date.now() - startTime;

        // ✅ Safe access to response properties
        const runData = response.data?.run || {};
        const compileData = response.data?.compile || {};
        
        const stdout = runData.stdout || '';
        const stderr = runData.stderr || '';
        const compileStderr = compileData.stderr || '';
        const exitCode = runData.code !== undefined ? runData.code : 1;

        const testResult = {
          input: testCase.input || "",
          expected: testCase.expectedOutput,
          actual: stdout.trim(),
          passed: false,
          executionTime,
          error: null,
        };

        // Check compilation first
        if (compileStderr) {
          testResult.error = `Compilation Error: ${compileStderr}`;
        } else if (exitCode === 0) {
          const actualOutput = stdout.trim();
          const expectedOutput = (testCase.expectedOutput || "").trim();
          testResult.passed = actualOutput === expectedOutput;

          if (!testResult.passed) {
            testResult.error = `Expected: "${expectedOutput}", Got: "${actualOutput}"`;
          }
        } else {
          testResult.error = `Runtime Error: ${stderr || 'Unknown error'}`;
        }

        results.push(testResult);
      } catch (error) {
        console.error(`❌ Java test case ${i + 1} error:`, error);
        results.push({
          input: testCase.input || "",
          expected: testCase.expectedOutput,
          actual: "",
          passed: false,
          executionTime: 0,
          error: `API Error: ${error.message}`,
        });
      }
    }

    return results;
  }

  // ✅ Normalize setup SQL to be AlaSQL-friendly
  static normalizeSQLForAlaSQL(sql) {
    if (!sql || typeof sql !== 'string') return sql || '';
    // Add AUTOINCREMENT to PK integer columns so omitted IDs are auto-generated
    let out = sql.replace(/\bINTEGER\s+PRIMARY\s+KEY\b/gi, 'INT AUTOINCREMENT PRIMARY KEY');
    out = out.replace(/\bINT\s+PRIMARY\s+KEY\b/gi, 'INT AUTOINCREMENT PRIMARY KEY');
    return out;
  }

  // ✅ Execute SQL code using AlaSQL (no WASM issues)
  static async executeSQL(sqlQuery, testCases) {
    const results = [];

    try {
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        try {
          const startTime = Date.now();

          // Create a new AlaSQL database instance for each test case
          const db = new alasql.Database();

          // Execute setup queries
          if (testCase.input && testCase.input.trim()) {
            // 1) Normalize schema for AlaSQL autoincrement on integer PKs
            const normalizedInput = this.normalizeSQLForAlaSQL(testCase.input.trim());

            // 2) Proactively drop any tables listed in CREATE statements to avoid clashes
            const createMatches = normalizedInput.match(/CREATE\s+TABLE\s+([`"']?)(\w+)\1/gi) || [];
            createMatches.forEach(stmt => {
              const m = stmt.match(/CREATE\s+TABLE\s+[`"']?(\w+)[`"']?/i);
              if (m && m[1]) {
                try { db.exec(`DROP TABLE IF EXISTS ${m[1]}`); } catch (_) {}
              }
            });

            // 3) Run the setup SQL statements
            const setupQueries = normalizedInput
              .split(';')
              .map(q => q.trim())
              .filter(q => q.length > 0);

            for (const setupQuery of setupQueries) {
              if (setupQuery) {
                db.exec(setupQuery);
              }
            }
          }

          // Execute main query
          const queryResult = db.exec(sqlQuery);
          const executionTime = Date.now() - startTime;

          let actualOutput = '';
          if (queryResult && queryResult.length > 0) {
            actualOutput = JSON.stringify(queryResult);
          } else {
            actualOutput = '[]';
          }

          const testResult = {
            input: testCase.input || "",
            expected: testCase.expectedOutput,
            actual: actualOutput,
            passed: false,
            executionTime,
            error: null,
          };

          const expectedOutput = (testCase.expectedOutput || "").trim();
          testResult.passed = expectedOutput === actualOutput.trim();

          if (!testResult.passed) {
            testResult.error = `Expected: "${expectedOutput}", Got: "${actualOutput}"`;
          }

          results.push(testResult);
        } catch (error) {
          console.error(`❌ SQL test case ${i + 1} error:`, error);
          results.push({
            input: testCase.input || "",
            expected: testCase.expectedOutput,
            actual: "",
            passed: false,
            executionTime: 0,
            error: `SQL Error: ${error.message}`,
          });
        }
      }
    } catch (error) {
      console.error('❌ SQL execution error:', error);
      return testCases.map(testCase => ({
        input: testCase.input || "",
        expected: testCase.expectedOutput,
        actual: "",
        passed: false,
        executionTime: 0,
        error: `SQL Engine Error: ${error.message}`,
      }));
    }

    return results;
  }

  // ✅ Main execution method
  static async executeCode(code, language, testCases) {
    console.log(`🔥 Executing ${language} code with ${testCases.length} test cases`);

    let results = [];

    switch (language.toLowerCase()) {
      case 'python':
        results = await this.executePython(code, testCases);
        break;
      case 'java':
        results = await this.executeJava(code, testCases);
        break;
      case 'sql':
        results = await this.executeSQL(code, testCases);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    // Calculate final results
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

// ✅ Component to display test case outputs
const TestCaseOutput = ({ testCase, index, language }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const parseJsonString = (str) => {
    if (!str) return null;
    
    if (typeof str === 'object') return str;
    
    if (typeof str === 'string') {
      try {
        return JSON.parse(str);
      } catch (e) {
        return str;
      }
    }
    
    return str;
  };

  const renderOutput = (output, label) => {
    if (!output && output !== 0 && output !== '') {
      return <div className="text-sm text-gray-400">No output</div>;
    }

    // For SQL outputs, try to parse and render as table
    if (language === 'sql') {
      const parsedOutput = parseJsonString(output);
      
      if (Array.isArray(parsedOutput)) {
        return <JsonTable data={parsedOutput} label={label} />;
      }
      
      if (parsedOutput && typeof parsedOutput === 'object') {
        return <JsonTable data={[parsedOutput]} label={label} />;
      }
    }

    // For non-SQL or non-parseable outputs, show as preformatted text
    const displayOutput = typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output);
    return (
      <pre className="p-2 overflow-x-auto text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 border rounded">
        {displayOutput}
      </pre>
    );
  };

  const isPassed = testCase.passed || false;
  
  return (
    <div className={`border rounded-lg mb-3 ${isPassed ? 'border-green-600' : 'border-red-600'}`}>
      <div 
        className={`p-3 cursor-pointer flex items-center justify-between ${
          isPassed ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}></div>
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
          {/* Input */}
          {testCase.input && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-300">Input:</h4>
              <pre className="p-2 overflow-x-auto text-xs text-gray-300 bg-gray-800 border rounded">
                {testCase.input}
              </pre>
            </div>
          )}
          
          {/* Expected Output */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Expected Output:</h4>
            <div className="p-3 bg-gray-900 border rounded">
              {renderOutput(testCase.expected, 'expected')}
            </div>
          </div>
          
          {/* Actual Output */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">Actual Output:</h4>
            <div className={`p-3 rounded border ${
              isPassed ? 'bg-gray-900' : 'bg-red-900 bg-opacity-10 border-red-600'
            }`}>
              {renderOutput(testCase.actual, 'actual')}
            </div>
          </div>
          
          {/* Error message if any */}
          {testCase.error && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-red-400">Error:</h4>
              <pre className="p-2 overflow-x-auto text-xs text-red-300 bg-red-900 border border-red-600 rounded bg-opacity-20">
                {testCase.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ✅ Main Test Results Component
const TestResultsDisplay = ({ testResults, language }) => {
  if (!testResults || !testResults.testCases || testResults.testCases.length === 0) {
    return null;
  }

  const { passedTests, totalTests, score, testCases } = testResults;

  return (
    <div className="p-4 mt-4 bg-gray-800 border border-gray-600 rounded-lg">
      {/* Summary */}
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

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-gray-700 rounded-full">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              score === 100 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>

      {/* Individual Test Cases */}
      <div className="space-y-3">
        <h4 className="mb-3 font-medium text-gray-200 text-md">Test Case Details:</h4>
        {testCases.map((testCase, index) => (
          <TestCaseOutput
            key={index}
            testCase={testCase}
            index={index}
            language={language}
          />
        ))}
      </div>
    </div>
  );
};

const CodeEditor = () => {
  const { assessmentId, questionId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  // ✅ Suppress ResizeObserver errors - MUST be called at the top level
  useSupressResizeObserverErrors();
  
  // State management
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

  // Refs for persistence
  const timerRef = useRef(null);
  const cacheKeyRef = useRef(null);
  const lastSaveRef = useRef(Date.now());

  // ✅ Simple copy/paste prevention for editor
  const handleCopy = useCallback((e) => {
    e.preventDefault();
    toast.error('Copy operation is disabled during assessment');
    return false;
  }, []);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    toast.error('Paste operation is disabled during assessment');
    return false;
  }, []);

  const handleCut = useCallback((e) => {
    e.preventDefault();
    toast.error('Cut operation is disabled during assessment');
    return false;
  }, []);

  // ✅ Cache management functions
  const getCacheKey = useCallback((assessmentId, questionId, userId) => {
    return `codeEditor_${assessmentId}_${questionId}_${userId}`;
  }, []);

  const getCacheData = useCallback((cacheKey) => {
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const setCacheData = useCallback((cacheKey, data) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      lastSaveRef.current = Date.now();
    } catch (error) {
      // Handle silently
    }
  }, []);

  const clearCacheData = useCallback((cacheKey) => {
    try {
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Handle silently
    }
  }, []);

  // ✅ Save current state to cache
  const saveToCache = useCallback(() => {
    if (!cacheKeyRef.current || !currentQuestion) return;
    
    const cacheData = {
      code,
      timeRemaining,
      sessionStartTime,
      questionId,
      lastSaved: Date.now(),
      testResults
    };
    
    setCacheData(cacheKeyRef.current, cacheData);
  }, [code, timeRemaining, sessionStartTime, questionId, testResults, setCacheData]);

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
    if (Date.now() - lastSaveRef.current > 2000) {
      saveToCache();
    }
  }, [saveToCache]);

  // ✅ Timer with cache persistence
  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          if (newTime % 10 === 0) {
            setTimeout(saveToCache, 100);
          }
          
          if (newTime <= 0) {
            handleTimeUp();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining, saveToCache]);

  // Save code to cache on change
  useEffect(() => {
    if (code && currentQuestion) {
      debouncedSaveToCache();
    }
  }, [code, currentQuestion, debouncedSaveToCache]);

  // Load assessment data
  useEffect(() => {
    loadAssessmentData();
    
    gsap.timeline()
      .fromTo('.editor-header', 
        { y: -50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
      )
      .fromTo('.editor-content', 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.6 }, 
        '-=0.4'
      );
  }, [assessmentId]);

  // Update current question and restore cache
  useEffect(() => {
    if (questions.length > 0 && questionId && user) {
      const questionIndex = questions.findIndex(q => q.id === questionId);
      if (questionIndex >= 0) {
        const question = questions[questionIndex];
        
        if (!question.language) {
          toast.error('Question configuration error: missing language');
          return;
        }
        
        setCurrentQuestionIndex(questionIndex);
        setCurrentQuestion(question);
        
        cacheKeyRef.current = getCacheKey(assessmentId, questionId, user.uid);
        
        const cachedData = loadFromCache();
        
        if (cachedData && cachedData.questionId === questionId) {
          setCode(cachedData.code || question.starterCode || getDefaultCode(question.language));
          setTimeRemaining(cachedData.timeRemaining);
          setSessionStartTime(cachedData.sessionStartTime);
          setTestResults(cachedData.testResults || null);
          setIsFromCache(true);
          
          toast.success('🔄 Session restored from cache', { duration: 2000 });
        } else {
          const initialCode = question.starterCode || getDefaultCode(question.language);
          setCode(initialCode);
          setTestResults(null);
          setIsFromCache(false);
        }
      }
    }
  }, [questionId, questions, user, assessmentId, getCacheKey, loadFromCache]);

  const getDefaultCode = (language) => {
    const defaultCodes = {
      python: 'print("Hello World")',
      java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
      javascript: 'console.log("Hello World");',
      sql: 'SELECT "Hello World" AS message;',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World" << endl;\n    return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}'
    };
    return defaultCodes[language] || '';
  };

  // Enhanced renderSampleOutput for SQL in problem description
  const renderSampleOutput = (output, language) => {
    if (!output) return null;

    if (language === 'sql') {
      try {
        const parsed = JSON.parse(output);
        if (Array.isArray(parsed)) {
          return <JsonTable data={parsed} label="sample" />;
        }
      } catch (e) {
        // Fall back to regular pre display
      }
    }

    return (
      <pre className="p-3 overflow-x-auto text-sm bg-gray-700 rounded-lg">
        {output}
      </pre>
    );
  };

  const loadAssessmentData = async () => {
    try {
      setLoading(true);
      
      const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));
      if (!assessmentDoc.exists()) {
        toast.error('Assessment not found');
        navigate('/');
        return;
      }

      const assessmentData = { id: assessmentDoc.id, ...assessmentDoc.data() };
      setAssessment(assessmentData);
      
      if (!isFromCache) {
        const initialTime = assessmentData.timeLimit * 60;
        setTimeRemaining(initialTime);
        setSessionStartTime(Date.now());
      }

      if (assessmentData.questions && assessmentData.questions.length > 0) {
        const questionPromises = assessmentData.questions.map(qId =>
          getDoc(doc(db, 'questions', qId))
        );
        
        const questionDocs = await Promise.all(questionPromises);
        const questionsData = questionDocs
          .filter(doc => doc.exists())
          .map(doc => ({ id: doc.id, ...doc.data() }));
        
        setQuestions(questionsData);
        
        if (questionId) {
          const questionIndex = questionsData.findIndex(q => q.id === questionId);
          if (questionIndex >= 0) {
            const question = questionsData[questionIndex];
            setCurrentQuestionIndex(questionIndex);
            setCurrentQuestion(question);
          }
        } else if (questionsData.length > 0) {
          navigate(`/code/${assessmentId}/${questionsData[0].id}`, { replace: true });
        }
      }

      const submissionsSnapshot = await getDocs(
        query(
          collection(db, 'submissions'),
          where('userId', '==', user.uid),
          where('assessmentId', '==', assessmentId)
        )
      );

      const submissionsData = {};
      submissionsSnapshot.forEach(doc => {
        const submission = doc.data();
        submissionsData[submission.questionId] = submission;
      });
      setSubmissions(submissionsData);

    } catch (error) {
      toast.error('Failed to load assessment');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode || '');
  };

  // ✅ Handle code execution using fixed client-side engine
  const handleRunCode = async () => {
    if (!code || !code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    if (!currentQuestion?.language) {
      toast.error('Programming language not specified');
      return;
    }

    if (!currentQuestion?.testCases || currentQuestion.testCases.length === 0) {
      toast.error('No test cases available for this question');
      return;
    }

    setRunning(true);
    
    try {
      console.log('🔥 Executing code client-side...');
      
      const result = await CodeExecutionEngine.executeCode(
        code.trim(),
        currentQuestion.language,
        currentQuestion.testCases
      );
      
      setTestResults(result);
      saveToCache();
      
      if (result.passedTests === result.totalTests) {
        toast.success(`🎉 All ${result.totalTests} test cases passed! Score: ${result.score}%`);
      } else {
        toast.success(`${result.passedTests}/${result.totalTests} test cases passed. Score: ${result.score}%`);
      }

    } catch (error) {
      console.error('Code execution error:', error);
      toast.error(`Code execution failed: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!testResults) {
      toast.error('Please run your code first');
      return;
    }

    setSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
      
      // Create submission directly in Firestore (no Firebase Functions needed)
      const submissionData = {
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

      const submissionRef = await addDoc(collection(db, 'submissions'), submissionData);
      
      if (cacheKeyRef.current) {
        clearCacheData(cacheKeyRef.current);
      }
      
      setSubmissions(prev => ({
        ...prev,
        [currentQuestion.id]: {
          ...testResults,
          code,
          submittedAt: new Date(),
          score: testResults.score,
          submissionId: submissionRef.id,
          completed: true
        }
      }));

      toast.success(`Solution submitted! Score: ${testResults.score}%`);
      
      if (currentQuestionIndex < questions.length - 1) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        navigate(`/code/${assessmentId}/${nextQuestion.id}`);
      } else {
        questions.forEach(q => {
          const cacheKey = getCacheKey(assessmentId, q.id, user.uid);
          clearCacheData(cacheKey);
        });
        
        toast.success('Assessment completed! 🎉');
        navigate('/dashboard');
      }
      
    } catch (error) {
      toast.error('Failed to submit solution: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuestionChange = (questionIndex) => {
    saveToCache();
    const question = questions[questionIndex];
    navigate(`/code/${assessmentId}/${question.id}`);
  };

  const handleTimeUp = () => {
    if (cacheKeyRef.current) {
      clearCacheData(cacheKeyRef.current);
    }
    
    toast.error('Time\'s up! Assessment ended.');
    navigate('/dashboard');
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (!timeRemaining) return 'text-gray-600';
    const percentage = (timeRemaining / (assessment?.timeLimit * 60)) * 100;
    
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const resetCode = () => {
    const resetCode = currentQuestion?.starterCode || getDefaultCode(currentQuestion?.language);
    setCode(resetCode);
    setTestResults(null);
    saveToCache();
    toast.success('Code reset');
  };

  const saveProgress = () => {
    saveToCache();
    toast.success('Progress saved');
  };

  const restartSession = () => {
    if (cacheKeyRef.current) {
      clearCacheData(cacheKeyRef.current);
    }
    
    setCode(currentQuestion?.starterCode || getDefaultCode(currentQuestion?.language));
    setTestResults(null);
    setTimeRemaining(assessment?.timeLimit * 60);
    setSessionStartTime(Date.now());
    setIsFromCache(false);
    
    toast.success('Session restarted');
  };

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      saveToCache();
    };
  }, [saveToCache]);

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
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gray-900 text-white flex`}>
      {/* Sidebar */}
      {showSidebar && (
        <div className="flex flex-col bg-gray-800 border-r border-gray-700 w-80">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold truncate">{assessment?.title}</h2>
            <p className="text-sm text-gray-400">{questions.length} Questions</p>
            
            {isFromCache && (
              <div className="flex items-center mt-2 text-xs text-green-400">
                <RefreshCw className="w-3 h-3 mr-1" />
                Session restored from cache
              </div>
            )}
            
            {/* Frontend execution indicator */}
            <div className="flex items-center mt-2 text-xs text-blue-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Client-side execution (Piston API + AlaSQL)
            </div>
          </div>

          {/* Timer */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Time Remaining</span>
              <div className={`text-xl font-bold ${getTimeColor()}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="mb-3 font-semibold">Questions</h3>
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const isCurrentQuestion = index === currentQuestionIndex;
                  const isSubmitted = submissions[question.id];
                  
                  return (
                    <button
                      key={question.id}
                      onClick={() => handleQuestionChange(index)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isCurrentQuestion
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Q{index + 1}</span>
                        {isSubmitted && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="mt-1 text-sm truncate opacity-80">
                        {question.title}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          question.difficulty === 'easy' ? 'bg-green-600' :
                          question.difficulty === 'medium' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-gray-400">
                          {question.marks} pts
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1">
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
              
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold">
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
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-600">
                    Frontend Execution
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={saveProgress}
                className="p-2 transition-colors rounded-lg hover:bg-gray-700"
                title="Save Progress"
              >
                <Save className="w-5 h-5" />
              </button>
              
              <button
                onClick={resetCode}
                className="p-2 transition-colors rounded-lg hover:bg-gray-700"
                title="Reset Code"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <button
                onClick={restartSession}
                className="p-2 transition-colors rounded-lg hover:bg-gray-700"
                title="Restart Session"
              >
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
        <div className="flex flex-1 editor-content">
          {/* Left Panel - Problem Description */}
          <div className="w-1/3 overflow-y-auto bg-gray-800 border-r border-gray-700">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-bold">Problem Description</h2>
              
              <div className="prose prose-invert max-w-none">
                <div className="leading-relaxed text-gray-300 whitespace-pre-wrap">
                  {currentQuestion.description}
                </div>
                
                {currentQuestion.sampleInput && (
                  <div className="mt-6">
                    <h3 className="mb-2 text-lg font-semibold text-white">Sample Input</h3>
                    <pre className="p-3 overflow-x-auto text-sm bg-gray-700 rounded-lg">
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
                    <div className="text-sm text-gray-300">
                      {currentQuestion.constraints}
                    </div>
                  </div>
                )}
                
                {currentQuestion.hints && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-lg font-semibold text-white">Hints</h3>
                    <div className="text-sm text-gray-300">
                      {currentQuestion.hints}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Code Editor and Results */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Code Editor */}
            <div className="flex-1">
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
            
            {/* Bottom Panel - Action Buttons and Test Results */}
            <div className="bg-gray-800 border-t border-gray-700">
              {/* Action Buttons */}
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

                  {/* Navigation */}
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
                
                {/* Execution info */}
                <div className="flex items-center p-3 mt-4 space-x-2 text-purple-400 bg-purple-900 rounded-lg bg-opacity-20">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Code execution: Python/Java via Piston API, SQL via AlaSQL (no WASM issues)
                  </span>
                </div>
              </div>

              {/* ✅ Enhanced Test Results Display */}
              <div className="overflow-y-auto max-h-96">
                <TestResultsDisplay testResults={testResults} language={currentQuestion.language} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
