'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface Course {
  courseName: string;
  instructor: string;
  room: string;
  courseCode: string;
  dayOfWeek: number;
  timeSlot: string;
  periodIndex: number;
}

interface DetailedScheduleData {
  semester: string;
  studentName: string;
  courses: Course[];
  timeSlots: string[];
}

interface ScheduleData {
  legacy?: boolean;
  data?: boolean[][];
  semester?: string;
  studentName?: string;
  courses?: Course[];
  timeSlots?: string[];
}

export default function StartupPage() {
  const searchParams = useSearchParams();
  const [copySuccess, setCopySuccess] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Get the first argument from search params
  const argument = searchParams.get(searchParams.keys().next().value || '') || null;
  
  // Parse schedule data if present
  const scheduleParam = searchParams.get('schedule');
  let scheduleData: ScheduleData | null = null;
  
  if (scheduleParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(scheduleParam));
      // Check if it's the old boolean array format or new detailed format
      if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
        // Old format - convert to legacy display
        scheduleData = { legacy: true, data: parsed };
      } else {
        // New detailed format
        scheduleData = parsed;
      }
    } catch (error) {
      console.error('Failed to parse schedule data:', error);
    }
  }

  const currentUrl = `javascript:(function(){function getSevenBooleanArrays(){const weekArrays=Array.from({length:7},()=>new Array(13).fill(false));const tableRows=document.querySelectorAll('table tr');for(let i=1;i<tableRows.length&&i<=13;i++){const row=tableRows[i];const cells=row.querySelectorAll('td');if(cells.length>=8){for(let dayIndex=0;dayIndex<7;dayIndex++){const cellContent=cells[dayIndex+1].textContent.trim();if(cellContent&&cellContent!=='　'&&cellContent!==''){weekArrays[dayIndex][i-1]=true;}}}}return weekArrays;}function extractAndExport(){try{let scheduleData=getSevenBooleanArrays();scheduleData=scheduleData.map(dayArray=>dayArray.slice(1));console.log('=== Extracted Schedule Arrays (trimmed) ===');const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];scheduleData.forEach((dayArray,index)=>{console.log(\`\${dayNames[index]}:\`,dayArray);});console.log('\n=== JSON Format (ready for parsing) ===');console.log(JSON.stringify(scheduleData));const encodedData=encodeURIComponent(JSON.stringify(scheduleData));const targetUrl=\`http://localhost:3000/startup?schedule=\${encodedData}\`;console.log('\n=== Opening localhost:3000 with data ===');console.log('URL:',targetUrl);alert('課表數據已提取！正在開啟新視窗...\nSchedule extracted! Opening new window...');window.open(targetUrl,'_blank');return scheduleData;}catch(error){alert('提取課表時發生錯誤：'+error.message+'\nError extracting schedule: '+error.message);console.error('Schedule extraction error:',error);}}extractAndExport();})();`;

  // Breathing animation effect
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.animation = 'breathe 3s ease-in-out infinite';
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

  // Render legacy schedule table (boolean arrays)
  const renderLegacyScheduleTable = (schedule: boolean[][]) => {
    const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const timeSlots = [
      '08:10-09:00', '09:10-10:00', '10:10-11:00', '11:10-12:00',
      '12:10-13:00', '13:10-14:00', '14:10-15:00', '15:10-16:00',
      '16:10-17:00', '17:10-18:00', '18:10-19:00', '19:10-20:00',
      '20:10-21:00'
    ];

    return (
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          課表 Schedule (簡化版)
        </h2>
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-center">時間</th>
              {dayNames.map((day, index) => (
                <th key={index} className="border border-gray-300 p-2 text-center">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border border-gray-300 p-2 text-center bg-gray-50 font-medium">
                  {time}
                </td>
                {schedule.map((daySchedule, dayIndex) => (
                  <td
                    key={dayIndex}
                    className={`border border-gray-300 p-2 text-center ${
                      daySchedule[rowIndex] 
                        ? 'bg-blue-100 text-blue-800 font-semibold' 
                        : 'bg-white'
                    }`}
                  >
                    {daySchedule[rowIndex] ? '有課' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Render detailed schedule table
  const renderDetailedScheduleTable = (scheduleData: ScheduleData) => {
    const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const { semester = '', studentName = '', courses = [], timeSlots = [] } = scheduleData;

    // Create a grid to organize courses by day and time
    const scheduleGrid: (Course | null)[][] = Array(timeSlots.length).fill(null).map(() => Array(7).fill(null));
    
    courses.forEach((course: Course) => {
      if (course.periodIndex >= 0 && course.periodIndex < timeSlots.length) {
        scheduleGrid[course.periodIndex][course.dayOfWeek] = course;
      }
    });

    const getRandomColor = (courseName: string) => {
      const colors = [
        'bg-blue-100 border-blue-300 text-blue-800',
        'bg-green-100 border-green-300 text-green-800',
        'bg-purple-100 border-purple-300 text-purple-800',
        'bg-yellow-100 border-yellow-300 text-yellow-800',
        'bg-pink-100 border-pink-300 text-pink-800',
        'bg-indigo-100 border-indigo-300 text-indigo-800',
        'bg-red-100 border-red-300 text-red-800',
        'bg-cyan-100 border-cyan-300 text-cyan-800'
      ];
      
      let hash = 0;
      for (let i = 0; i < courseName.length; i++) {
        hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{semester}</h2>
          <h3 className="text-lg font-semibold text-gray-600">{studentName} 的課表</h3>
        </div>
        
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-3 text-center font-semibold">時間</th>
              {dayNames.map((day, index) => (
                <th key={index} className="border border-gray-300 p-3 text-center font-semibold min-w-[120px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot: string, rowIndex: number) => (
              <tr key={rowIndex}>
                <td className="border border-gray-300 p-3 text-center bg-gray-50 font-medium whitespace-nowrap">
                  {timeSlot}
                </td>
                {scheduleGrid[rowIndex].map((course, dayIndex) => (
                  <td
                    key={dayIndex}
                    className={`border border-gray-300 p-2 text-center ${
                      course ? getRandomColor(course.courseName) + ' border-2' : 'bg-white'
                    }`}
                  >
                    {course ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-xs leading-tight">
                          {course.courseName}
                        </div>
                        <div className="text-xs opacity-80">
                          {course.instructor}
                        </div>
                        <div className="text-xs font-mono">
                          {course.room !== 'Unknown' && course.room !== '*' ? course.room : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="h-12"></div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {courses.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">課程清單</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {courses.map((course: Course, index: number) => (
                <div key={index} className={`p-3 rounded-md border-2 ${getRandomColor(course.courseName)}`}>
                  <div className="font-semibold">{course.courseName}</div>
                  <div className="text-sm mt-1">
                    <div>教師：{course.instructor}</div>
                    <div>教室：{course.room}</div>
                    <div>時間：{dayNames[course.dayOfWeek]} {course.timeSlot}</div>
                    {course.courseCode && <div className="text-xs mt-1 font-mono">代碼：{course.courseCode}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className={`${scheduleData ? 'max-w-4xl' : 'max-w-md'} w-full space-y-8`}>
        <div className="text-center">
          <h1 ref={titleRef} className="text-3xl font-extrabold text-gray-900 mb-8">
            {scheduleData ? '課表顯示' : '先到興大SSO登入後，進入以下網址：'}
          </h1>
          
          {scheduleData ? (
            // Display the schedule table if schedule data is present
            scheduleData.legacy && scheduleData.data ? 
              renderLegacyScheduleTable(scheduleData.data) : 
              renderDetailedScheduleTable(scheduleData)
          ) : argument ? (
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