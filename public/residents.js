let residentRequest=0;
async function loadResidentSummary(){
 const request=++residentRequest;
 const cards=$('residentSummaryCards');
 cards.setAttribute('aria-busy','true');
 $('residentSummaryError').textContent='Memuat ringkasan warga…';
 try{
 const result=await api('publicResidents');
 if(request!==residentRequest)return;
 const number=new Intl.NumberFormat('id-ID');
 $('residentTotal').textContent=number.format(result.data.residents);
 $('residentHouseholds').textContent=number.format(result.data.households);
 $('residentRTs').textContent=number.format(result.data.neighborhoods);
 $('residentSummaryError').textContent='';
 }catch(error){
 if(request!==residentRequest)return;
 ['residentTotal','residentHouseholds','residentRTs'].forEach(id=>$(id).textContent='—');
 $('residentSummaryError').textContent=error.message;
 }finally{
 if(request===residentRequest)cards.removeAttribute('aria-busy');
 }
}
$('residentRefresh').onclick=loadResidentSummary;
document.querySelector('[data-page="home"]').addEventListener('click',loadResidentSummary);
document.addEventListener('residents-updated',loadResidentSummary);
loadResidentSummary();
