const paymentDialog=$('payDialog'),paymentContent=$('payContent');
const statusLabels={PENDING:'Menunggu verifikasi',APPROVED:'Disetujui',REJECTED:'Ditolak'};
let paymentBusy=false,paymentDraftId='',paymentConfig;
const adminButton=$('payAdmin');
new MutationObserver(()=>adminButton.hidden=!token).observe($('account'),{childList:true});
adminButton.hidden=!token;
function paymentShell(title) {
 paymentContent.replaceChildren();
 const head=E('div','','modalhead'),close=E('button','×','outline');
 close.type='button';close.setAttribute('aria-label','Tutup');
 close.onclick=()=>{if(!paymentBusy)paymentDialog.close();};
 head.append(E('h2',title),close);
 paymentContent.append(head);
 if(!paymentDialog.open)paymentDialog.showModal();
}
paymentDialog.addEventListener('cancel',event=>{if(paymentBusy)event.preventDefault();});
function paymentError(message){const p=E('p',message,'error');p.setAttribute('role','alert');paymentContent.append(p);}
function paymentField(form,name,label,type='text',required=true) {
 const wrap=E('label',label),input=E(type==='select'?'select':'input');
 if(type!=='select')input.type=type;
 input.name=name;input.required=required;
 if(['text','tel'].includes(type))input.maxLength=name==='address'?200:100;
 wrap.append(input);form.append(wrap);return input;
}
function paymentAction(label,fn,cls='') {
 const button=E('button',label,cls);button.type='button';button.onclick=fn;return button;
}
async function openPayment(){
 paymentShell('Pembayaran Iuran');
 paymentContent.append(E('p','Memuat penerima…'));
 try {
 paymentConfig=(await api('paymentConfig')).data;
 paymentShell('Pembayaran Iuran');
 const c=paymentConfig;
 if(!c.name||!c.number){paymentContent.append(E('p','Pengurus belum mengatur rekening penerima.'));return;}
 paymentContent.append(E('p','Penerima DANA · '+c.name),E('strong',c.number));
 paymentContent.append(paymentAction('Salin Nomor DANA',async()=>{
 try{await navigator.clipboard.writeText(c.number);}catch{paymentError('Salin nomor yang tampil di atas secara manual.');}
 },'outline'));
 if(c.qr){const image=E('img');image.src=c.qr;image.alt='QR pembayaran '+c.name;image.className='paymentQR';paymentContent.append(image);}
 paymentContent.append(E('p','Bayar melalui aplikasi DANA atau pindai QR yang tersedia. Periksa nama penerima dan nominal sebelum menyelesaikan pembayaran. Setelah membayar, unggah bukti di bawah.','hint'));
 const form=E('form');
 paymentField(form,'name','Nama pembayar').maxLength=100;
 const category=paymentField(form,'category','Jenis iuran','select');
 category.append(new Option('Pilih jenis iuran',''),...c.categories.map(x=>new Option(x.name,x.id)));
 const amount=paymentField(form,'amount','Nominal yang dibayar (Rp)','number');amount.min=1;amount.max=1000000000;amount.step=1;
 paymentField(form,'date','Tanggal pembayaran','date').value=dateNow();
 const proof=paymentField(form,'proof','Bukti pembayaran (JPG / PNG / WebP, maksimal 5 MB)','file');
 proof.accept='image/jpeg,image/png,image/webp';
 const submit=E('button','Kirim Bukti Pembayaran');form.append(submit);
 let formError=E('p','','error');form.append(formError);
 paymentContent.append(form);
 form.onsubmit=async event=>{
 event.preventDefault();if(paymentBusy)return;
 if(!paymentDraftId)paymentDraftId=crypto.randomUUID();
 paymentBusy=true;submit.disabled=true;formError.textContent='';
 try{
 const record={...Object.fromEntries(new FormData(form)),id:paymentDraftId};
 record.amount=Number(record.amount);record.proof=await photo(proof.files[0]);
 const result=await api('submitPayment',{record});
 try{localStorage.setItem('wargahub-payment-'+result.data.id,result.data.id);}catch{}
 paymentDraftId='';
 paymentShell('Bukti Terkirim');
 paymentContent.append(E('p','Simpan nomor referensi berikut untuk mengecek status pembayaran.'));
 const ref=E('input');ref.readOnly=true;ref.value=result.data.id;ref.onclick=()=>ref.select();paymentContent.append(ref);
 paymentContent.append(E('p','Status · '+statusLabels[result.data.status]));
 paymentContent.append(paymentAction('Cek Status',()=>checkPayment(result.data.id)));
 }catch(error){formError.textContent=error.message;}finally{paymentBusy=false;submit.disabled=false;}
 };
 const checkForm=E('form'),reference=paymentField(checkForm,'reference','Sudah mengirim bukti? Masukkan nomor referensi');
 const check=E('button','Cek Status');checkForm.append(check);paymentContent.append(E('hr'),checkForm);
 checkForm.onsubmit=event=>{event.preventDefault();checkPayment(reference.value.trim());};
 }catch(error){paymentError(error.message);}
}
async function checkPayment(id){
 paymentShell('Status Pembayaran');
 try{
 const d=(await api('paymentStatus',{record:{id}})).data;
 paymentContent.append(E('p',statusLabels[d.status]),E('p',d.categoryName+' · '+money(d.amount)),
 E('p','Tanggal pembayaran '+d.date),E('p','Referensi '+d.id));
 if(d.note)paymentContent.append(E('p',d.note));
 paymentContent.append(paymentAction('Kembali',openPayment,'outline'));
 }catch(error){paymentError(error.message);}
}
async function openPaymentAdmin(){
 paymentShell('Pembayaran Warga');
 paymentContent.append(paymentAction('Atur Penerima DANA & QR',openPaymentSettings,'outline'));
 try{
 const list=(await api('paymentList')).data;
 if(!list.length)paymentContent.append(E('p','Belum ada pengajuan pembayaran.'));
 list.forEach(d=>{
 const section=E('section','','paymentItem');
 section.append(E('h3',d.name),E('p',d.categoryName+' · '+money(d.amount)),
 E('p',d.date+' · '+statusLabels[d.status]),
 E('p','Referensi '+d.id,'hint'),E('p','Tujuan '+d.recipient+' · '+d.recipientNumber,'hint'));
 const image=E('img');image.hidden=true;image.className='paymentProof';
 section.append(paymentAction('Lihat Bukti',async()=>{
 try{image.src=(await api('paymentProof',{record:{id:d.id}})).data.proof;image.alt='Bukti pembayaran '+d.name;image.hidden=false;}
 catch(error){paymentError(error.message);}
 },'outline'),image);
 if(d.status==='PENDING'){
 const note=E('input');note.placeholder='Catatan verifikasi / alasan penolakan';note.maxLength=300;note.setAttribute('aria-label','Catatan verifikasi');
 section.append(note);
 async function review(status){
 if(paymentBusy)return;
 if(status==='REJECTED'&&!note.value.trim()){note.reportValidity();paymentError('Isi alasan penolakan.');return;}
 if(!confirm(status==='APPROVED'?'Dana sudah diperiksa di akun penerima? Setujui dan catat pemasukan?':'Tolak pengajuan pembayaran ini?'))return;
 paymentBusy=true;section.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{await api('reviewPayment',{record:{id:d.id,status,note:note.value}});await reload();await openPaymentAdmin();}
 catch(error){paymentError(error.message);}
 finally{paymentBusy=false;section.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 const buttons=E('div','','actions');
 buttons.append(paymentAction('Setujui & Catat Kas',()=>review('APPROVED')),paymentAction('Tolak',()=>review('REJECTED'),'outline'));
 section.append(buttons);
 }
 if(d.reviewNote)section.append(E('p',d.reviewNote));
 paymentContent.append(section);
 });
 }catch(error){paymentError(error.message);}
}
async function openPaymentSettings(){
 paymentShell('Penerima Pembayaran');
 try{
 const c=(await api('paymentConfig')).data,form=E('form');
 paymentField(form,'name','Nama penerima DANA').value=c.name;
 paymentField(form,'number','Nomor DANA penerima','tel').value=c.number;
 const qr=paymentField(form,'qr','QR pembayaran (gambar opsional)','file',false);qr.accept='image/jpeg,image/png,image/webp';
 const clear=paymentField(form,'clear','Hapus QR saat ini','checkbox',false);
 paymentContent.append(E('p','Unggah QR resmi penerima. Uji QR setelah disimpan untuk memastikan nama dan tujuan pembayaran benar.','hint'));
 const submit=E('button','Simpan Penerima');form.append(submit);paymentContent.append(form);
 form.onsubmit=async event=>{
 event.preventDefault();if(paymentBusy)return;
 paymentBusy=true;submit.disabled=true;
 try{
 const record={...Object.fromEntries(new FormData(form)),version:c.version,
 qr:clear.checked?'':qr.files[0]?await photo(qr.files[0]):c.qr};
 await api('savePaymentConfig',{record});await openPaymentAdmin();
 }catch(error){paymentError(error.message);}finally{paymentBusy=false;submit.disabled=false;}
 };
 }catch(error){paymentError(error.message);}
}
$('payOpen').onclick=openPayment;adminButton.onclick=openPaymentAdmin;
