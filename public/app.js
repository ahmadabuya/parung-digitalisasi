const $=id=>document.getElementById(id), config=window.WARGAHUB;
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const dateNow=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date());
const E=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text??'';if(cls)e.className=cls;return e;};
let token=sessionStorage.getItem('wargahub-token')||'', data={},page='home',editing=null,busy=false;
$('brand').textContent=$('footerBrand').textContent=config.name;$('area').textContent=config.area;
if(/^https:\/\/wa.me\/\d+$/.test(config.contact)){$('contact').href=config.contact;$('contact').hidden=false;}
async function api(action,extra={}){
 if(!/^https:\/\//.test(config.api) || config.api.includes('GANTI-'))throw new Error('Isi alamat Worker di public/config.js untuk menghubungkan data.');
 const response=await fetch(config.api,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...extra})});
 const raw=await response.text();
 let result;
 try { result=JSON.parse(raw); }
 catch {
   throw new Error('Worker mengembalikan halaman teks, bukan data API (HTTP '+response.status+'). Pastikan kode worker.js terbaru sudah di-Deploy pada Worker yang sama dengan config.js.');
 }
 if(!result || typeof result.ok!=='boolean') {
   throw new Error('Format respons Worker tidak sesuai. Perbarui kode Worker WargaHub.');
 }
 if(response.status===401 && action!=='login') logout();
 if(!result.ok)throw new Error(result.error||'Permintaan gagal.');
 return result;
}
function notice(error){$('status').textContent=error?.message||'';}
function access(){document.querySelectorAll('.private').forEach(e=>e.hidden=!token);$('account').textContent=token?'Keluar':'Login Pengurus';}
function logout(){token='';data={};sessionStorage.removeItem('wargahub-token');access();navigate('home');}
let announcements=[],announcementIndex=0,newsRequest=0;
let autoplayPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const carousel=document.querySelector('.carousel');
$('newsAutoplay').textContent=autoplayPaused?'Putar otomatis':'Jeda otomatis';
$('newsAutoplay').onclick=()=>{
 autoplayPaused=!autoplayPaused;
 $('newsAutoplay').textContent=autoplayPaused?'Putar otomatis':'Jeda otomatis';
};
setInterval(()=>{
 if(!autoplayPaused && announcements.length>1 && page==='home' && !document.hidden &&
 !carousel.matches(':hover') && !carousel.contains(document.activeElement) && !$('newsDetail').open) {
 moveAnnouncement(1);
 }
},6000);
function renderAnnouncement(){
 const container=$('newsGrid');
 container.replaceChildren();
 $('carouselControls').hidden=announcements.length<2;
 $('newsAutoplay').hidden=announcements.length<2;
 $('newsPosition').textContent='';
 $('newsDots').replaceChildren();
 if(!announcements.length){
 container.append(E('p','Belum ada informasi yang diterbitkan.','empty'));return;
 }
 const n=announcements[announcementIndex],card=E('article','','featureNews');
 const visual=E('div','','featureVisual');
 if(n.photo){
 const image=E('img');image.src=n.photo;image.alt=n.title;
 image.onerror=()=>{image.hidden=true;visual.classList.add('noPhoto');};
 visual.append(image);
 }else visual.classList.add('noPhoto');
 const content=E('div','','featureContent'),time=E('time',n.date.split('-').reverse().join('/'));
 time.dateTime=n.date;
 const read=E('button','Baca informasi','newsRead');read.type='button';
 read.onclick=()=>{
 $('newsDetailTitle').textContent=n.title;$('newsDetailDate').textContent=time.textContent;
 $('newsDetailBody').textContent=n.body;
 $('newsDetailImage').hidden=!n.photo;
 $('newsDetailImage').src=n.photo||'';$('newsDetailImage').alt=n.title;
 $('newsDetail').showModal();
 };
 content.append(time,E('h2',n.title),E('p',n.body,'featureExcerpt'),read);
 card.append(visual,content);container.append(card);
 announcements.forEach((item,index)=>{
 const dot=E('button','','newsDot');dot.type='button';dot.setAttribute('aria-label','Informasi '+(index+1)+': '+item.title);
 dot.setAttribute('aria-current',index===announcementIndex?'true':'false');
 dot.onclick=()=>{announcementIndex=index;renderAnnouncement();$('newsDots').children[index]?.focus();};
 $('newsDots').append(dot);
 });
 $('newsPosition').textContent='Informasi '+(announcementIndex+1)+' dari '+announcements.length;
}
function moveAnnouncement(step){
 if(announcements.length<2)return;
 announcementIndex=(announcementIndex+step+announcements.length)%announcements.length;renderAnnouncement();
}
$('newsPrev').onclick=()=>moveAnnouncement(-1);
$('newsNext').onclick=()=>moveAnnouncement(1);
$('newsDetailClose').onclick=()=>$('newsDetail').close();
let touchStart=null;
$('newsGrid').addEventListener('touchstart',event=>{touchStart={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};},{passive:true});
$('newsGrid').addEventListener('touchend',event=>{
 if(!touchStart)return;
 const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;
 if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))moveAnnouncement(dx<0?1:-1);
 touchStart=null;
},{passive:true});
async function home(){
 const request=++newsRequest;
 $('newsGrid').setAttribute('aria-busy','true');
 try{
 const result=await api('public');
 if(request!==newsRequest)return;
 announcements=result.data;announcementIndex=0;renderAnnouncement();
 }catch(e){
 if(request!==newsRequest)return;
 announcements=[];$('newsAutoplay').hidden=true;$('carouselControls').hidden=true;$('newsPosition').textContent='';
 $('newsGrid').replaceChildren(E('p',e.message,'empty'));
 }finally{if(request===newsRequest)$('newsGrid').removeAttribute('aria-busy');}
}
async function reload(){notice();try{data=(await api('all')).data;render();document.dispatchEvent(new Event('residents-updated'));}catch(e){notice(e);}}
function navigate(next){
 if(next!=='home'&&!token){$('login').showModal();return;}
 page=next;$('home').hidden=page!=='home';$('admin').hidden=page==='home';
 document.querySelectorAll('[data-page]').forEach(e=>e.classList.toggle('active',e.dataset.page===page));
 if(page==='home'){home();return;}
 $('pageTitle').textContent={Warga:'Data Warga',Transaksi:'Kas & Iuran',Informasi:'Informasi Warga',Kategori:'Jenis Iuran'}[page];
 $('add').textContent='Tambah '+{Warga:'Warga',Transaksi:'Transaksi',Informasi:'Informasi',Kategori:'Jenis Iuran'}[page];
 ['categoryFilter','start','end'].forEach(id=>$(id).hidden=page!=='Transaksi');
 $('search').value='';$('start').value='';$('end').value='';$('categoryFilter').value='';
 if(!data.Warga)reload();else render();
}
function filtered(){
 const q=$('search').value.trim().toLowerCase();
 return(data[page]||[]).filter(r=>{
 const category=data.Kategori?.find(c=>c.id===r.category)?.name||'';
 return Object.values({...r,photo:'',category}).join(' ').toLowerCase().includes(q)&&
 (page!=='Transaksi'||((!$('categoryFilter').value||r.category===$('categoryFilter').value)&&
 (!$('start').value||r.date>=$('start').value)&&(!$('end').value||r.date<=$('end').value)));
 });
}
const columns={
 Warga:[['name','Nama'],['nik','NIK'],['kk','No. KK'],['address','Alamat'],['rt','RT'],['rw','RW'],['gender','Jenis kelamin'],['birthplace','Tempat lahir'],['birthdate','Tanggal lahir'],['phone','WhatsApp'],['occupation','Pekerjaan'],['religion','Agama'],['family','Hubungan keluarga'],['status','Status warga']],
 Transaksi:[['date','Tanggal'],['type','Jenis'],['category','Iuran'],['name','Pembayar / Penerima'],['amount','Nominal'],['note','Keterangan']],
 Informasi:[['date','Tanggal'],['title','Judul'],['published','Status']],
 Kategori:[['name','Jenis iuran']]
};
function render(){
 const selected=$('categoryFilter').value;
 $('categoryFilter').replaceChildren(new Option('Semua jenis iuran',''),...(data.Kategori||[]).map(c=>new Option(c.name,c.id)));
 $('categoryFilter').value=selected;
 const rows=filtered();
 $('stats').replaceChildren();$('categorySummary').replaceChildren();
 const stat=(label,value)=>{const e=E('div','','stat');e.append(E('small',label),E('strong',value));$('stats').append(e);};
 if(page==='Transaksi'){
 const sum=(list,type)=>list.filter(r=>r.type===type).reduce((n,r)=>n+r.amount,0);
 const income=sum(rows,'MASUK'),expense=sum(rows,'KELUAR');
 stat('Pemasukan sesuai filter',money(income));stat('Pengeluaran sesuai filter',money(expense));stat('Selisih sesuai filter',money(income-expense));
 const chips=E('div','','chips');
 (data.Kategori||[]).forEach(c=>{
 const all=(data.Transaksi||[]).filter(r=>r.category===c.id);
 chips.append(E('div',c.name+' · Saldo '+money(sum(all,'MASUK')-sum(all,'KELUAR')),'chip'));
 });$('categorySummary').append(E('p','Saldo keseluruhan per jenis iuran','hint'),chips);
 }else if(page==='Warga'){
 stat('Jumlah warga',String(rows.length));stat('Kartu keluarga terisi',String(new Set(rows.map(r=>r.kk).filter(Boolean)).size));stat('RT terdata',String(new Set(rows.map(r=>r.rt)).size));
 }else if(page==='Informasi'){stat('Informasi',String(rows.length));stat('Diterbitkan',String(rows.filter(r=>r.published).length));stat('Draf',String(rows.filter(r=>!r.published).length));}
 const head=E('tr');columns[page].forEach(([,name])=>head.append(E('th',name)));head.append(E('th','Tindakan'));$('thead').replaceChildren(head);$('tbody').replaceChildren();
 adminPager.slice(rows,[page,$('search').value,$('start').value,$('end').value,$('categoryFilter').value].join('|')).forEach(r=>{
 const tr=E('tr');
 columns[page].forEach(([key])=>{
 let value=r[key]||'';
 if(key==='amount')value=money(r.amount);
 if(key==='category')value=data.Kategori.find(c=>c.id===r.category)?.name||'Kategori dihapus';
 if(key==='published')value=r.published?'Terbit':'Draf';
 tr.append(E('td',value,key==='amount'?(r.type==='MASUK'?'in':'out'):''));
 });
 const td=E('td');const edit=E('button','Edit','outline');edit.onclick=()=>openEditor(r);
 const del=E('button','Hapus','outline');del.onclick=()=>remove(r,del);
 td.append(edit,del);tr.append(td);$('tbody').append(tr);
 });
 $('count').textContent=rows.length+' data ditampilkan.';
}
const fields={
 Warga:[['name','Nama lengkap','text',true],['nik','NIK (opsional, 16 digit)','text'],['kk','Nomor KK (opsional, 16 digit)','text'],['address','Alamat','text',true],['rt','RT','text',true],['rw','RW','text',true],['gender','Jenis kelamin',['Laki-laki','Perempuan']],['birthplace','Tempat lahir','text'],['birthdate','Tanggal lahir','date'],['phone','Nomor WhatsApp','tel'],['occupation','Pekerjaan','text'],['religion','Agama','text'],['family','Hubungan keluarga',['Kepala Keluarga','Suami','Istri','Anak','Orang tua','Lainnya']],['status','Status warga',['Tetap','Kontrak','Pindah','Meninggal']]],
 Transaksi:[['date','Tanggal','date',true],['type','Jenis transaksi',['MASUK','KELUAR'],true],['category','Jenis iuran','categories',true],['name','Nama pembayar / penerima','text',true],['amount','Nominal rupiah','number',true],['note','Keterangan (tampil di Beranda jika keterangan publik kosong)','textarea'],['publicNote','Keterangan publik (opsional)','textarea']],
 Informasi:[['title','Judul informasi','text',true],['date','Tanggal','date',true],['body','Isi informasi','textarea',true],['photo','Foto informasi (maksimal 5 MB)','file'],['published','Terbitkan di Beranda','checkbox']],
 Kategori:[['name','Nama jenis iuran','text',true]]
};
function openEditor(record){
 editing=record?{...record}:{id:crypto.randomUUID(),version:0};$('editError').textContent='';
 $('editTitle').textContent=(record?'Edit ':'Tambah ')+$('pageTitle').textContent;$('fields').replaceChildren();
 if(page==='Transaksi'&&!data.Kategori.length){notice(new Error('Tambahkan jenis iuran terlebih dahulu.'));return;}
 fields[page].forEach(([key,label,type,required])=>{
 const wrap=E('label',label,type==='textarea'?'wide':'');
 let input;
 if(Array.isArray(type)||type==='categories'){
 input=E('select');input.append(new Option('Pilih…',''));
 const opts=type==='categories'?data.Kategori.map(c=>[c.name,c.id]):type.map(v=>[v,v]);
 opts.forEach(([text,value])=>input.append(new Option(text,value)));
 }else{input=E(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;}
 input.name=key;input.required=!!required;
 if(type==='checkbox')input.checked=record?record[key]:true;
 else if(type!=='file')input.value=record?.[key]||(type==='date'&&key!=='birthdate'?dateNow():'');
 if(type==='file'){input.accept='image/jpeg,image/png,image/webp';wrap.append(E('small',record?.photo?'Pilih foto baru untuk mengganti foto saat ini.':'Foto opsional.','hint'));}
 if(type==='number'){input.min=1;input.step=1;}
 if(['nik','kk'].includes(key)){input.pattern='[0-9]{16}';input.maxLength=16;input.inputMode='numeric';}
 if(type==='text'||type==='tel')input.maxLength=key==='address'?300:100;
 if(key==='title')input.maxLength=150;if(key==='body')input.maxLength=5000;if(key==='note')input.maxLength=500;
 wrap.append(input);$('fields').append(wrap);
 });
 $('editor').showModal();
}
async function photo(file){
 if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Gunakan JPG, PNG, atau WebP maksimal 5 MB.');
 const image=await createImageBitmap(file),canvas=document.createElement('canvas');
 try{for(const width of [800,600,450,300,200]){
 const scale=Math.min(1,width/image.width);canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
 canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 const encoded=canvas.toDataURL('image/jpeg',.7);if(encoded.length<40000)return encoded;
 }throw new Error('Foto terlalu besar setelah dikompresi.');}finally{image.close();}
}
$('editForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;busy=true;const entity=page;
 const dialog=$('editor');dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{
 const fd=new FormData(event.target),record={...editing,...Object.fromEntries(fd)};
 if(entity==='Informasi'){record.published=fd.has('published');record.photo=fd.get('photo').size?await photo(fd.get('photo')):editing.photo||'';}
 if(entity==='Transaksi')record.amount=Number(record.amount);
 await api('save',{entity,record});dialog.close();await reload();
 }catch(e){$('editError').textContent=e.message;}
 finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
};
$('editor').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
async function remove(record,button){
 if(!confirm('Hapus data ini?'))return;button.disabled=true;
 try{await api('delete',{entity:page,record});await reload();}catch(e){notice(e);}finally{button.disabled=false;}
}
$('loginForm').onsubmit=async event=>{
 event.preventDefault();const submit=event.submitter;submit.disabled=true;$('loginError').textContent='';
 try{const result=await api('login',{password:new FormData(event.target).get('password')});
 token=result.token;sessionStorage.setItem('wargahub-token',token);event.target.reset();$('login').close();access();navigate('Warga');
 }catch(e){$('loginError').textContent=e.message;}finally{submit.disabled=false;}
};
$('export').onclick=()=>{
 const list=filtered(),cols=columns[page];
 const escape=v=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const lines=[cols.map(([,label])=>escape(label)).join(','),
 ...list.map(r=>cols.map(([key])=>escape(key==='category'?data.Kategori.find(c=>c.id===r.category)?.name:r[key])).join(','))];
 const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const link=E('a');link.href=url;link.download=page+'-'+dateNow()+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('account').onclick=()=>token?logout():$('login').showModal();$('add').onclick=()=>openEditor();
['search','categoryFilter','start','end'].forEach(id=>$(id).addEventListener('input',render));
const adminPager=createPager($('tbody').closest('.tablewrap'),render);
$('reload').onclick=reload;$('refreshHome').onclick=home;access();home();
