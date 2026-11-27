function transactionTotals(rows){
 const incoming=rows.filter(row=>row.type==='MASUK').reduce((total,row)=>total+Number(row.amount||0),0);
 const outgoing=rows.filter(row=>row.type==='KELUAR').reduce((total,row)=>total+Number(row.amount||0),0);
 return {count:rows.length,incoming,outgoing,difference:incoming-outgoing};
}
function renderTransactionSummary(container,rows){
 const totals=transactionTotals(rows);
 container.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Ringkasan hasil pencarian';
 const note=document.createElement('p');note.className='hint';
 note.textContent='Dihitung dari seluruh hasil pencarian dan filter, termasuk halaman tabel lainnya.';
 const grid=document.createElement('div');grid.className='summaryGrid';
 for(const [label,value] of [
 ['Jumlah transaksi',String(totals.count)],
 ['Total pemasukan',money(totals.incoming)],
 ['Total pengeluaran',money(totals.outgoing)],
 ['Selisih pemasukan − pengeluaran',money(totals.difference)]
 ]){
 const card=document.createElement('div');card.className='stat';
 const title=document.createElement('small');title.textContent=label;
 const number=document.createElement('strong');number.textContent=value;
 card.append(title,number);grid.append(card);
 }
 container.append(heading,note,grid);
}
