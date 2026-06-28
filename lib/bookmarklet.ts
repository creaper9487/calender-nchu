// 產生課表擷取 bookmarklet（書籤小工具）。
// 使用者在興大「一週課表」頁（cportal vocscrd_table）執行，會把空檔 7×13 bit-pack 成
// base64url，再導回本站 /import?d=...。空堂判定：該格 textContent.trim() === ''。

export const NCHU_TIMETABLE_URL =
  'https://cportal.nchu.edu.tw/cofsys/plsql/vocscrd_table';

/** 回傳可貼成書籤的 javascript: 字串。origin 為本站來源（例如 https://xxx.vercel.app）。 */
export function buildBookmarklet(origin: string): string {
  // 內嵌腳本：找課表 table，列 1..13 為節次、欄 1..7 為週一..週日；空格 = 有空。
  const script = `(function(){try{
var t=document.querySelector('table');if(!t){alert('找不到課表，請在「一週課表」頁執行');return;}
var rows=t.rows,bytes=new Uint8Array(12);
for(var p=0;p<13;p++){var r=rows[p+1];if(!r)continue;for(var d=0;d<7;d++){var c=r.cells[d+1];if(c&&c.textContent.trim()===''){var i=d*13+p;bytes[i>>3]|=(1<<(i&7));}}}
var bin='';for(var k=0;k<bytes.length;k++)bin+=String.fromCharCode(bytes[k]);
var b64=btoa(bin).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
location.href=${JSON.stringify(origin)}+'/import?d='+b64;
}catch(e){alert('擷取課表失敗：'+e.message);}})();`;
  return 'javascript:' + encodeURIComponent(script);
}
