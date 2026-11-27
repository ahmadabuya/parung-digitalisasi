function createPager(target,render) {
 const wrapper=document.createElement('div');wrapper.className='pagination';
 const label=document.createElement('label');label.textContent='Tampilkan';
 const select=document.createElement('select');select.setAttribute('aria-label','Jumlah baris tabel');
 [10,25,50,100].forEach(n=>select.append(new Option(String(n),String(n))));
 label.append(select);
 const previous=document.createElement('button');previous.textContent='Sebelumnya';previous.className='outline';
 const next=document.createElement('button');next.textContent='Berikutnya';next.className='outline';
 const info=document.createElement('span');info.setAttribute('aria-live','polite');
 wrapper.append(label,info,previous,next);target.insertAdjacentElement('afterend',wrapper);
 let page=1,signature='';
 select.onchange=()=>{page=1;render();};
 previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
 return {
 slice(rows,key){
  if(signature!==key){signature=key;page=1;}
  const size=Number(select.value),pages=Math.max(1,Math.ceil(rows.length/size));
  page=Math.min(Math.max(1,page),pages);
  previous.disabled=page===1;next.disabled=page===pages;
  info.textContent=rows.length?((page-1)*size+1)+'–'+Math.min(page*size,rows.length)+' dari '+rows.length:'0 data';
  return rows.slice((page-1)*size,page*size);
 }
 };
}
