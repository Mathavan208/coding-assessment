import React from 'react';

const SebConfigPage = () => {
  // XML content as a string
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<SafeExamBrowserConfig>
  <configVersion>2.0</configVersion>
  <examKey>exam-key-12345</examKey>
  <examSessionKey>session-key-67890</examSessionKey>
  
  <!-- URL of your code editor -->
  <examUrl>http://localhost:3000/#/assessment/u6stXz1WsmQHek3KAza1</examUrl>
  
  <!-- Browser restrictions -->
  <browserWindow>
    <showAddressBar>false</showAddressBar>
    <showToolBar>false</showToolBar>
    <showMenuBar>false</showMenuBar>
    <showStatusBar>false</showStatusBar>
    <allowFullscreen>true</allowFullscreen>
    <allowNewWindows>false</allowNewWindows>
    <allowPopups>false</allowPopups>
  </browserWindow>
  
  <!-- Keyboard restrictions -->
  <keyboard>
    <allowFunctionKeys>false</allowFunctionKeys>
    <allowSpecialKeys>false</allowSpecialKeys>
    <allowModifierKeys>true</allowModifierKeys>
    <allowPrintScreen>false</allowPrintScreen>
    <allowCtrlAltDel>false</allowCtrlAltDel>
    <allowAltTab>false</allowAltTab>
    <allowEscKey>true</allowEscKey>
  </keyboard>
  
  <!-- Process restrictions -->
  <processRestrictions>
    <allowOtherProcesses>false</allowOtherProcesses>
    <allowStartMenu>false</allowStartMenu>
    <allowTaskManager>false</allowTaskManager>
  </processRestrictions>
  
  <!-- Additional restrictions -->
  <additionalRestrictions>
    <allowRightClick>false</allowRightClick>
    <allowDragAndDrop>false</allowDragAndDrop>
    <allowCopyPaste>false</allowCopyPaste>
    <allowPrinting>false</allowPrinting>
    <allowFileDownloads>false</allowFileDownloads>
    <allowFileUploads>false</allowFileUploads>
  </additionalRestrictions>
  
  <!-- Time limit (in minutes) -->
  <timeLimit>60</timeLimit>
  <timeLimitAction>quit</timeLimitAction>
  
  <!-- Exam session -->
  <examSession>
    <allowRestart>false</allowRestart>
    <allowQuit>false</allowQuit>
    <allowQuitExam>false</allowQuitExam>
  </examSession>
</SafeExamBrowserConfig>`;

  // Create blob and URL for download
  const blob = new Blob([xmlContent], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white bg-gray-900">
      <div className="w-full max-w-2xl p-6 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="mb-4 text-2xl font-bold">Safe Exam Browser Configuration</h1>
        <p className="mb-6">
          To take this exam in a secure environment, you need to configure Safe Exam Browser (SEB).
          Please follow the instructions below:
        </p>
        
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-lg font-semibold">Download Configuration File</h2>
            <p className="mb-2">Download the SEB configuration file:</p>
            <a 
              href={url} 
              download="seb-config.xml"
              className="inline-block px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Download SEB Config
            </a>
          </div>
          
          <div>
            <h2 className="mb-2 text-lg font-semibold">Manual Configuration</h2>
            <p className="mb-2">If the download doesn't work, follow these steps:</p>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>Download and install Safe Exam Browser from <a href="https://safeexambrowser.org" className="text-blue-400">safeexambrowser.org</a></li>
              <li>Launch SEB</li>
              <li>Go to File > Open Configuration</li>
              <li>Copy and paste the XML content below into a text file and save as "seb-config.xml"</li>
              <li>In SEB, browse to and select this file</li>
            </ol>
            
            <div className="p-4 mt-4 bg-gray-700 rounded-lg">
              <h3 className="mb-2 font-semibold">XML Configuration:</h3>
              <pre className="p-3 overflow-auto text-xs bg-gray-800 rounded max-h-64">
                {xmlContent}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="p-4 mt-8 bg-yellow-900 rounded-lg">
          <h3 className="mb-2 font-semibold">Important Notes:</h3>
          <ul className="pl-5 space-y-1 list-disc">
            <li>Make sure you have the latest version of SEB installed</li>
            <li>Close all other applications before starting the exam</li>
            <li>Do not attempt to exit SEB during the exam</li>
            <li>Your work will be saved automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SebConfigPage;