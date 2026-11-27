(() => {
  const $=id=>document.getElementById(id);
  const status=$('artist-status');
  const profile=artist=>`/artist-profile.html?artist=${encodeURIComponent(artist)}`;
  const element=(tag,text)=>{
    const node=document.createElement(tag);
    if (text) node.textContent=text;
    return node;
  };

  async function read(url) {
    const response=await fetch(url,{cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if (!response.ok || !data) throw new Error(data?.error || 'Artist pages are temporarily unavailable.');
    return data;
  }

  function genres(list,values) {
    list.replaceChildren(...(values ?? []).map(genre=>element('li',genre)));
    list.hidden=!list.children.length;
  }

  async function directory() {
    const {artists}=await read('/api/public/artists');
    for (const artist of artists) {
      const article=element('article');article.className='path-card';
      const heading=element('h2',artist.displayName);
      const headline=element('p',artist.headline);
      const tags=element('ul');tags.className='genre-tags';genres(tags,artist.genres);
      const link=element('a','View artist');link.className='outline-link';link.href=profile(artist.username);
      article.append(heading,headline,tags,link);$('artist-cards').append(article);
    }
    status.textContent=artists.length?'':'New artist pages will appear here when they’re published.';
    status.hidden=Boolean(artists.length);
  }

  async function artistPage() {
    const username=new URLSearchParams(location.search).get('artist');
    const data=await read(`/api/public/artist-page?artist=${encodeURIComponent(username || '')}`);
    $('artist-name').textContent=data.displayName;
    $('artist-handle').textContent=`@${data.username}`;
    $('artist-headline').textContent=data.content.headline;
    $('artist-bio').textContent=data.content.bio;
    $('artist-bio').hidden=!data.content.bio;
    genres($('artist-genres'),data.content.genres);
    $('artist-live-link').href=`/artist-live.html?artist=${encodeURIComponent(data.username)}`;
    if (data.content.website) {
      $('artist-website').href=data.content.website;
      $('artist-website').hidden=false;
    }
    document.title=`${data.displayName} | The ARHC`;
    $('artist-profile').hidden=false;
    status.hidden=true;
    document.dispatchEvent(new CustomEvent('arhc:artist-profile',{detail:data.username}));
  }

  const load=document.body.dataset.artistView==='profile'?artistPage:directory;
  load().catch(error=>{status.textContent=error.message;});
})();
