'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Timeline } from 'animejs';

export default function StartupPage() {
  const searchParams = useSearchParams();
  const [copySuccess, setCopySuccess] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Get the first argument from search params
  const argument = searchParams.get(searchParams.keys().next().value || '') || null;
  
  const currentUrl = `javascript:(function(){
  function getSevenBooleanArrays(){
    const weekArrays = [
      new Array(13).fill(false),
      new Array(13).fill(false),
      new Array(13).fill(false),
      new Array(13).fill(false),
      new Array(13).fill(false),
      new Array(13).fill(false),
      new Array(13).fill(false)
    ];

    const tableRows = document.querySelectorAll('table tr');
    for(let i=1; i<tableRows.length && i<=13; i++){
      const row = tableRows[i];
      const cells = row.querySelectorAll('td');
      if(cells.length >= 8){
        for(let dayIndex=0; dayIndex<7; dayIndex++){
          const cellContent = cells[dayIndex+1].textContent.trim();
          if(cellContent && cellContent !== '　' && cellContent !== ''){
            weekArrays[dayIndex][i-1] = true;
          }
        }
      }
    }
    return weekArrays;
  }

  function extractAndExport(){
    try{
      const scheduleData = getSevenBooleanArrays();
      console.log('=== Extracted Schedule Arrays ===');
      const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      scheduleData.forEach((dayArray,index)=>{
        console.log(\`\${dayNames[index]}:\`, dayArray);
      });

      console.log('\\n=== JSON Format (ready for parsing) ===');
      console.log(JSON.stringify(scheduleData));

      const encodedData = encodeURIComponent(JSON.stringify(scheduleData));
      const targetUrl = \`http://localhost:3000?schedule=\${encodedData}\`;

      console.log('\\n=== Opening localhost:3000 with data ===');
      console.log('URL:', targetUrl);

      alert('課表數據已提取！正在開啟新視窗...\\nSchedule extracted! Opening new window...');
      window.open(targetUrl,'_blank');
      return scheduleData;
    }catch(error){
      alert('提取課表時發生錯誤：' + error.message + '\\nError extracting schedule: ' + error.message);
      console.error('Schedule extraction error:', error);
    }
  }

  extractAndExport();
})();`
  
  // Breathing animation effect
  useEffect(() => {
    if (titleRef.current) {
      const tl = new Timeline({ 
        loop: true
      });
      
      tl.add(titleRef.current, {
        scale: [1, 1.05],
        opacity: [0.8, 1],
        duration: 1500,
        ease: 'out-sine'
      }).add(titleRef.current, {
        scale: [1.05, 1],
        opacity: [1, 0.8],
        duration: 1500,
        ease: 'out-sine'
      });
    }
  }, []);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 ref={titleRef} className="text-3xl font-extrabold text-gray-900 mb-8">
            先到興大SSO登入後，進入以下網址：
          </h1>
          
          {argument ? (
            // Display the argument if present
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Received Argument:
              </h2>
              <p className="text-xl font-mono bg-gray-100 p-3 rounded border break-all">
                {argument}
              </p>
            </div>
          ) : (
            // Display copyable link if no arguments
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                把網址加入書籤
              </h2>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentUrl}
                  readOnly
                  className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded font-semibold transition-colors ${
                    copySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-md text-gray-900 mt-2">
                  然後前往
                <a
                    href="https://cportal.nchu.edu.tw/cofsys/plsql/vocscrd_table"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 mx-2 underline"
                >
                    這裡
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}