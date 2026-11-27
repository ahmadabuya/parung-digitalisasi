let publicFinanceData=null;
const financePager=createPager($('financeRows').closest('.tablewrap'),renderPublicFinance);
function financePeriodRows() {
 const from=$('financeFrom').value,to=$('financeTo').value,category=$('financeCategory').value;
 return publicFinanceData.transactions.filter(t=>
 (!from||t.date>=from)&&(!to||t.date<=to)&&(!category||t.category===category));
}
function renderPublicFinance() {
 if(!publicFinanceData)return;
 const from=$('financeFrom').value,to=$('financeTo').value,category=$('financeCategory').value;
 $('financeError').textContent='';
 if(from&&to&&from>to){$('financeError').textContent='Tanggal awal harus sebelum atau sama dengan tanggal akhir.';
 $('financeSummary').replaceChildren();$('financeStats').replaceChildren();$('financeChart').replaceChildren();$('financeRows').replaceChildren();$('financeCount').textContent='';return;}
 const rows=financePeriodRows(),sum=(list,type)=>list.filter(t=>t.type===type).reduce((n,t)=>n+t.amount,0);
 const allCategory=publicFinanceData.transactions.filter(t=>!category||t.category===category);
 const throughEnd=allCategory.filter(t=>!to||t.date<=to);
 const closing=sum(throughEnd,'MASUK')-sum(throughEnd,'KELUAR');
 $('financeStats').replaceChildren();
 for(const [label,value]of[
 ['Pemasukan periode',sum(rows,'MASUK')],['Pengeluaran periode',sum(rows,'KELUAR')],
 [to?'Saldo sampai '+to:'Saldo keseluruhan',closing]]){
 const box=E('div','','stat');box.append(E('small',label),E('strong',money(value)));$('financeStats').append(box);
 }
 const months=new Map();
 rows.forEach(t=>{
 const month=t.date.slice(0,7);
 if(!months.has(month))months.set(month,{MASUK:0,KELUAR:0});
 months.get(month)[t.type]+=t.amount;
 });
 const peak=Math.max(1,...Array.from(months.values()).flatMap(m=>[m.MASUK,m.KELUAR]));
 $('financeChart').replaceChildren();
 Array.from(months.keys()).sort().forEach(month=>{
 const group=E('div','','financeMonth');
 group.append(E('strong',new Date(month+'-01T12:00:00Z').toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'UTC'})));
 for(const type of ['MASUK','KELUAR']){
 const line=E('div','','financeLine'),label=type==='MASUK'?'Masuk':'Keluar';
 const track=E('div','','financeTrack'),bar=E('div','',type==='MASUK'?'financeBar':'financeBar expense');
 bar.style.width=(months.get(month)[type]/peak*100)+'%';track.append(bar);
 line.append(E('span',label),track,E('strong',money(months.get(month)[type])));group.append(line);
 }
 $('financeChart').append(group);
 });
 if(!rows.length)$('financeChart').append(E('p','Belum ada transaksi pada periode ini.','hint'));
 const query=$('financeSearch').value.trim().toLowerCase();
 const details=rows.filter(t=>(!$('financeType').value||t.type===$('financeType').value)&&[t.name,t.note,publicFinanceData.categories.find(c=>c.id===t.category)?.name]
 .join(' ').toLowerCase().includes(query)).sort((a,b)=>b.date.localeCompare(a.date));
 renderTransactionSummary($('financeSummary'),details);
 $('financeRows').replaceChildren();
 financePager.slice(details,[$('financeType').value,$('financeFrom').value,$('financeTo').value,$('financeCategory').value,$('financeSearch').value].join('|')).forEach(t=>{
 const row=E('tr');
 const categoryName=publicFinanceData.categories.find(c=>c.id===t.category)?.name||'Jenis iuran lama';
 [t.date.split('-').reverse().join('/'),t.name||'—',categoryName,t.type==='MASUK'?'Pemasukan':'Pengeluaran',t.note||'—',money(t.amount)]
 .forEach((value,i)=>row.append(E('td',value,i===5?(t.type==='MASUK'?'in':'out'):'')));
 $('financeRows').append(row);
 });
 $('financeCount').textContent=details.length+' transaksi ditampilkan. Pembayaran warga tercatat setelah disetujui pengurus.';
}
let financeRequestVersion=0;
async function loadPublicFinance(){
 const version=++financeRequestVersion;
 $('financeError').textContent='Memuat data keuangan…';
 try{
 const result=await api('publicFinance');if(version!==financeRequestVersion)return;
 publicFinanceData=result.data;
 const selected=$('financeCategory').value;
 $('financeCategory').replaceChildren(new Option('Semua jenis iuran',''),
 ...publicFinanceData.categories.map(c=>new Option(c.name,c.id)));
 $('financeCategory').value=selected;
 renderPublicFinance();
 }catch(error){if(version===financeRequestVersion)$('financeError').textContent=error.message;}
}
$('financeFrom').value=dateNow().slice(0,7)+'-01';
$('financeTo').value=dateNow();
['financeFrom','financeTo','financeCategory','financeType','financeSearch'].forEach(id=>$(id).addEventListener('input',renderPublicFinance));
$('financeAll').onclick=()=>{$('financeFrom').value='';$('financeTo').value='';renderPublicFinance();};
$('financeReload').onclick=loadPublicFinance;
document.querySelector('[data-page="home"]').addEventListener('click',loadPublicFinance);
$('refreshHome').addEventListener('click',loadPublicFinance);
loadPublicFinance();
