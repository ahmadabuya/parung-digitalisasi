let publicFinanceData=null;
const financePager=createPager($('financeRows').closest('.tablewrap'),renderPublicFinance);
function filterFinanceTransactions(transactions,categories,filters) {
 const query=filters.search.trim().toLowerCase();
 return transactions.filter(t=>
 (!filters.from||t.date>=filters.from)&&
 (!filters.to||t.date<=filters.to)&&
 (!filters.category||t.category===filters.category)&&
 (!filters.type||t.type===filters.type)&&
 [t.name,t.note,categories.find(c=>c.id===t.category)?.name].join(' ').toLowerCase().includes(query)
 ).sort((a,b)=>b.date.localeCompare(a.date));
}
function renderPublicFinance() {
 if(!publicFinanceData)return;
 const filters={from:$('financeFrom').value,to:$('financeTo').value,
 category:$('financeCategory').value,type:$('financeType').value,search:$('financeSearch').value};
 $('financeError').textContent='';
 if(filters.from&&filters.to&&filters.from>filters.to){
 $('financeError').textContent='Tanggal awal harus sebelum atau sama dengan tanggal akhir.';
 $('financeSummary').replaceChildren();$('financeRows').replaceChildren();
 financePager.slice([],'invalid');
 $('financeCount').textContent='';return;
 }
 const details=filterFinanceTransactions(publicFinanceData.transactions,publicFinanceData.categories,filters);
 renderTransactionSummary($('financeSummary'),details);
 $('financeRows').replaceChildren();
 financePager.slice(details,JSON.stringify(filters)).forEach(t=>{
 const row=E('tr');
 const categoryName=publicFinanceData.categories.find(c=>c.id===t.category)?.name||'Jenis iuran lama';
 [t.date.split('-').reverse().join('/'),t.name||'—',categoryName,t.type==='MASUK'?'Pemasukan':'Pengeluaran',t.note||'—',money(t.amount)]
 .forEach((value,i)=>row.append(E('td',value,i===5?(t.type==='MASUK'?'in':'out'):'')));
 $('financeRows').append(row);
 });
 $('financeCount').textContent=details.length+' transaksi sesuai filter. Pembayaran warga tercatat setelah disetujui pengurus.';
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
