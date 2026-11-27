const status=document.getElementById('editor-status');
const form=document.getElementById('artist-page-form');
const unpublish=document.getElementById('unpublish-page');
const endpoint='/api/account/artist-page';
let page;

function message(text,error=false) {
  status.textContent=text;
  status.className=error?'error':'';
}

async function request(body) {
  const options={cache:'no-store'};
  if (body) Object.assign(options,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await fetch(endpoint,options);
  const data=await response.json().catch(()=>null);
  if (!response.ok || !data) throw Object.assign(new Error(data?.error || 'The artist editor is unavailable.'),{status:response.status,field:data?.field});
  return data;
}

function render(data,fillDraft=true) {
  page=data;
  if (fillDraft) for (const key of ['headline','bio','genres','website']) {
    form.elements[key].value=key==='genres'?data.draft.genres?.join(', ') || '':data.draft[key] || '';
  }
  const live=Boolean(data.publishedAt && data.canPublish);
  document.getElementById('page-visibility-status').textContent=live?'Published in the artist directory.':
    data.publishedAt?'Hidden while paid membership is inactive.':'Draft only.';
  document.getElementById('editor-membership').hidden=data.canPublish;
  const link=document.getElementById('artist-published-link');
  link.href=`/artist-profile.html?artist=${encodeURIComponent(data.username)}`;
  link.hidden=!live;
  unpublish.hidden=!data.publishedAt;
  document.getElementById('artist-editor').hidden=false;
  setPending(false);
}

function setPending(pending) {
  form.elements.save.disabled=pending;
  form.elements.publish.disabled=pending || !page?.canPublish;
  unpublish.disabled=pending;
}

function handleError(error) {
  if (error.status===401) {
    document.getElementById('artist-editor').hidden=true;
    document.getElementById('editor-signin').hidden=false;
  }
  if (error.field && form.elements[error.field]) form.elements[error.field].focus();
  message(error.message,true);
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  const action=event.submitter?.name==='publish'?'publish':'save';
  const values=Object.fromEntries(new FormData(form));
  setPending(true);message(action==='publish'?'Publishing…':'Saving draft…');
  try {
    render(await request({...values,genres:values.genres.split(',').map(genre=>genre.trim()).filter(Boolean),action}));
    message(action==='publish'?'Your artist page is published.':'Draft saved.');
  } catch (error) {handleError(error);}
  finally {setPending(false);}
});

unpublish.addEventListener('click',async()=>{
  setPending(true);message('Unpublishing…');
  try {render(await request({action:'unpublish'}),false);message('Page unpublished. Your draft is saved.');}
  catch (error) {handleError(error);}
  finally {setPending(false);}
});

request().then(data=>{
  render(data);
  message(new URLSearchParams(location.search).has('welcome')?'Your artist account is ready. Start with your page draft.':'');
}).catch(handleError);
