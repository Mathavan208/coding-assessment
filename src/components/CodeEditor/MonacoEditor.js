import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, RotateCcw, Settings, Maximize2 } from 'lucide-react';

const MonacoEditor = ({ 
  language, 
  value, 
  onChange, 
  onRunCode, 
  onSubmitCode,
  theme = 'vs-dark',
  isRunning = false,
  testResults = null 
}) => {
  const editorRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const languageConfigs = {
    python: {
      defaultCode: `def solution():\n    # Write your code here\n    pass\n\n# Test your solution\nsolution()`,
      fileExtension: 'py'
    },
    java: {
      defaultCode: `public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}`,
      fileExtension: 'java'
    },
    sql: {
      defaultCode: `-- Write your SQL query here\nSELECT * FROM table_name;`,
      fileExtension: 'sql'
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      // Configure editor options
      editorRef.current.updateOptions({
        fontSize: fontSize,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        wordBasedSuggestions: true,
        formatOnType: true,
        formatOnPaste: true,
        autoIndent: 'advanced',
      });
    }
  }, [fontSize]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure language-specific settings
    if (language === 'python') {
      monaco.languages.setLanguageConfiguration('python', {
        autoClosingPairs: [
          { open: '"', close: '"' },
          { open: "'", close: "'" },
          { open: '(', close: ')' },
          { open: '[', close: ']' },
          { open: '{', close: '}' },
        ]
      });
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunCode && onRunCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      onSubmitCode && onSubmitCode();
    });
  };

  const resetCode = () => {
    const defaultCode = languageConfigs[language]?.defaultCode || '';
    onChange(defaultCode);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-white capitalize">
            {language} Editor
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRunCode}
              disabled={isRunning}
              className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              <Play className="w-4 h-4 mr-1" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
            
            <button
              onClick={onSubmitCode}
              className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            >
              <Save className="w-4 h-4 mr-1" />
              Submit
            </button>
            
            <button
              onClick={resetCode}
              className="flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="px-2 py-1 text-xs text-white bg-gray-700 rounded"
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
            </select>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex-1">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={value}
          onChange={onChange}
          onMount={handleEditorMount}
          options={{
            fontSize: fontSize,
            minimap: { enabled: !isFullscreen },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            wordBasedSuggestions: true,
            formatOnType: true,
            formatOnPaste: true,
            autoIndent: 'advanced',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            },
            smoothScrolling: true,
            mouseWheelZoom: true,
            contextmenu: true,
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
          }}
        />
      </div>

      {/* Test Results Panel */}
      {testResults && (
        <div className="overflow-auto bg-gray-900 border-t border-gray-700 h-1/3">
          <div className="p-4">
            <h3 className="mb-3 font-medium text-white">Test Results</h3>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.passed
                      ? 'bg-green-900/50 border-l-4 border-green-500'
                      : 'bg-red-900/50 border-l-4 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">
                      Test Case {index + 1}
                    </span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      result.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {result.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  
                  {!result.passed && (
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-400">Expected: </span>
                        <span className="font-mono text-white">{result.expectedOutput}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Got: </span>
                        <span className="font-mono text-red-400">{result.actualOutput}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-400">
                    Execution Time: {result.executionTime}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonacoEditor;
