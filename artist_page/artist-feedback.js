(() => {
  const root=document.getElementById('artist-feedback');
  const form=document.getElementById('artist-feedback-form');
  const status=document.getElementById('feedback-status');
  const signin=document.getElementById('feedback-signin');
  const fields=form.elements;
  const base='/api/account/guide/feedback';
  let artist;

  function syncOverlap() {
    fields.shareOverlap.disabled=!fields.follows.checked;
    if (fields.shareOverlap.disabled) fields.shareOverlap.checked=false;
  }

  function display({follows,shareOverlap,rating}) {
    fields.follows.checked=follows;
    fields.shareOverlap.checked=shareOverlap;
    fields.rating.value=rating ?? '';
    syncOverlap();
  }

  fields.follows.addEventListener('change',syncOverlap);

  document.addEventListener('arhc:artist-profile',async event=>{
    artist=event.detail;
    try {
      const response=await fetch(`${base}?artist=${encodeURIComponent(artist)}`,{cache:'no-store'});
      const data=await response.json();
      if (response.status===403 && data.code==='FAN_REQUIRED') return;
      root.hidden=false;
      if (response.status===401) {
        signin.href=`/join.html?next=artist-profile&artist=${encodeURIComponent(artist)}`;
        signin.hidden=false;
        return;
      }
      if (!response.ok) throw new Error(data.error);
      display(data);
      form.hidden=false;
    } catch {
      root.hidden=false;
      status.textContent='Artist feedback is currently unavailable.';
    }
  },{once:true});

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=form.querySelector('button');
    button.disabled=true;
    status.textContent='Saving…';
    try {
      const response=await fetch(base,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({artist,rating:fields.rating.value?Number(fields.rating.value):null,
          follows:fields.follows.checked,shareOverlap:fields.shareOverlap.checked})
      });
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || 'Try saving again.');
      display(data);
      status.textContent='Your feedback is saved.';
    } catch (error) {
      status.textContent=error.message || 'Artist feedback is currently unavailable.';
    } finally {
      button.disabled=false;
    }
  });
})();
