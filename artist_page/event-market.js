(() => {
  const $=id=>document.getElementById(id);
  const path='/api/account/coins/events';
  const date=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
  const integer=new Intl.NumberFormat();
  const usd=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});
  const createForm=$('event-create');
  const ruleForm=$('event-rule');
  const dialogue=$('event-confirm');
  let current;
  let next;
  let working=false;
  let refreshing=false;

  function element(tag,text,style) {
    const el=document.createElement(tag);
    if (text) el.textContent=text;
    if (style) el.className=style;
    return el;
  }

  function action(label,task) {
    const button=element('button',label,'secondary');
    button.type='button';
    button.addEventListener('click',task);
    return button;
  }

  function showStatus(message,style='') {
    const status=$('event-status');
    status.textContent=message;
    status.className=style;
  }

  async function request(endpoint,body) {
    const response=await fetch(path+endpoint,body?{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
    }:{cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if (!response.ok || !data) {
      if ([401,403].includes(response.status) && (!body || response.status===401)) {
        $('event-content').hidden=true;
        $('event-signin').hidden=response.status!==401;
        $('event-renew').hidden=response.status!==403;
      }
      throw new Error(data?.error || 'The artist event market is temporarily unavailable.');
    }
    return data;
  }

  function review(title,summary,endpoint,body,outcome) {
    if (working || dialogue.open) return;
    next={endpoint,body:{...body,operationKey:crypto.randomUUID()},outcome};
    $('event-confirm-title').textContent=title;
    $('event-confirm-text').textContent=summary;
    dialogue.returnValue='';
    dialogue.showModal();
  }

  dialogue.addEventListener('close',async()=>{
    if (dialogue.returnValue!=='confirm' || !next) {
      next=null;
      return;
    }
    const {endpoint,body,outcome}=next;
    next=null;
    working=true;
    showStatus('Confirming your transaction…');
    try {
      const result=await request(endpoint,body);
      if (endpoint==='/create') createForm.reset();
      if (endpoint==='/rule') ruleForm.reset();
      showStatus(outcome(result),'success');
      try {
        await refresh(true);
      } catch {
        showStatus('Transaction confirmed. Refresh the market to see the latest balances.','success');
      }
    } catch (error) {
      showStatus(error.message,'error');
    } finally {
      working=false;
    }
  });

  function group(id,items,render,empty) {
    $(id).replaceChildren(...(items.length?items.map(render):[element('p',empty,'muted')]));
  }

  function item(title,subtitle) {
    const node=element('article',null,'event-item');
    node.append(element('h3',title));
    if (subtitle) node.append(element('p',subtitle,'muted'));
    return node;
  }

  function links(node,...buttons) {
    const controls=element('div',null,'account-actions');
    controls.append(...buttons);
    node.append(controls);
  }

  const bird=number=>`${integer.format(Number(number))} Bird & Bee`;
  const serial=number=>`E${number}`;
  const money=number=>usd.format(Number(number)/100);
  function terms(ev) {
    return `Qualifying gift for ${ev.split_event}: contribute at least ${money(ev.minimum_minor)} toward ${ev.gift_name} from this artist’s wishlist. The gift must be funded; the artist approves the release.`;
  }

  function buy(ev,listingId) {
    review('Buy event coin',`Pay ${bird(ev.price_bird)} for an entry to ${ev.title}.`, '/buy',
      {issueId:ev.id,listingId},result=>`Event coin ${serial(result.serial)} is in your wallet.`);
  }

  function eventOffer(ev) {
    const node=item(ev.title,`${ev.display_name} · ${date.format(new Date(ev.starts_at))}`);
    node.id=`event-${ev.id}`;
    node.append(element('p',ev.description,'description'),
      element('p',`${bird(ev.price_bird)} per coin · ${ev.distributed} of ${ev.capacity} distributed`),
      element('p',`${ev.primary_left} available from the artist · ${ev.reserved_left} reserved for splits · ${ev.completed_resales} completed fan sales`));
    if (ev.gift_goal_id) node.append(element('p',terms(ev),'muted'));
    if (current.role==='fan' && ev.primary_left) links(node,action(`Buy for ${bird(ev.price_bird)}`,()=>buy(ev,null)));
    return node;
  }

  function listing(ev) {
    const node=item(ev.title,`${ev.display_name} · ${date.format(new Date(ev.starts_at))}`);
    node.append(element('p',`Coin ${serial(ev.serial)} · ${bird(ev.price_bird)}`));
    if (current.role==='fan') links(node,action(`Buy from fan for ${bird(ev.price_bird)}`,()=>buy(ev,ev.listing_id)));
    return node;
  }

  function walletCoin(coin) {
    const number=serial(coin.serial);
    const node=item(coin.title,`${number} · ${date.format(new Date(coin.starts_at))}`);
    if (coin.source_serial) node.append(element('p',`Split from coin ${serial(coin.source_serial)}.`,'muted'));
    if (coin.qualifies) node.append(element('p',`Gift qualified for ${coin.split_event}. Waiting for the artist to release the extra coin.`));
    else if (coin.gift_goal_id && !coin.split_released && new Date(coin.split_starts_at)>new Date()) node.append(element('p',terms(coin),'muted'));
    if (coin.split_released) node.append(element('p','The artist has released the split for this coin.'));
    if (coin.state==='claimed') {
      node.append(element('p','Access claimed'),element('p',coin.access_details,'access-details'));
      return node;
    }
    if (!coin.access_open) {
      node.append(element('p','Event ended','muted'));
      return node;
    }
    if (coin.listing_id) {
      node.append(element('p',`Listed for ${bird(coin.price_bird)}`));
      links(node,action('Remove listing',()=>review('Remove listing',`Take ${number} off the fan market.`,
        '/unlist',{serial:coin.serial},()=>`Listing for ${number} removed.`)));
    } else {
      const buttons=[];
      if (coin.sales_open && coin.source_serial) buttons.push(action('List for sale',
        ()=>review('List event coin',`List ${number} for ${bird(coin.price_bird)}. A sale transfers the entry to the buyer.`,
          '/list',{serial:coin.serial},()=>`Event coin ${number} listed.`)));
      buttons.push(action('Claim event access',()=>review('Claim event access',
        `Use ${number} for ${coin.title} to reveal the access details. This closes the coin to further trades.`,
        '/claim',{serial:coin.serial},()=>`Access details for ${number} are in your wallet.`)));
      links(node,...buttons);
    }
    return node;
  }

  function walletAlert(event) {
    const {detail}=event;
    const names={
      'coin.event.created':`Event released · ${detail.title}`,
      'coin.event.rule.created':`Gift threshold set · ${detail.title}`,
      'coin.event.split.released':`Split released · ${detail.title}`,
      'coin.event.access.claimed':`Access claimed · ${detail.title}`
    };
    const message=names[event.type] ||
      `${detail.direction==='sell'?'Sold':'Bought'} ${serial(detail.serial)} for ${bird(detail.birdCoins)} · ${detail.title}`;
    const row=element('li',message);
    const time=element('time',date.format(new Date(event.created_at)));
    time.dateTime=event.created_at;
    row.append(time);
    return row;
  }

  function select(field,items,placeholder) {
    const value=field.value;
    field.replaceChildren(new Option(placeholder,''),...items.map(({id,label})=>new Option(label,id)));
    field.value=items.some(item=>item.id===value)?value:'';
  }

  function setTargets() {
    const form=ruleForm.elements;
    const source=current.issues.find(ev=>ev.id===form.sourceId.value);
    const targets=source?current.issues.filter(ev=>new Date(ev.starts_at)>new Date(source.starts_at) &&
      new Date(ev.starts_at)>new Date() && ev.reserved_left && ev.price_bird===source.price_bird):[];
    select(form.targetId,targets.map(ev=>({id:ev.id,label:ev.title})),'Choose a later event');
  }

  function renderArtist(data) {
    const fields=ruleForm.elements;
    select(fields.sourceId,data.issues.filter(ev=>!ev.target_id).map(ev=>({id:ev.id,label:ev.title})),'Choose an event');
    setTargets();
    select(fields.goalId,data.goals.map(goal=>({id:goal.id,label:`${goal.reward_name} · ${money(goal.target_minor)}`})),'Choose a gift');
    group('event-eligible',data.eligible,fan=>{
      const node=item(fan.display_name,`${fan.title} → ${fan.target_title} · ${serial(fan.serial)}`);
      node.append(element('p',`Gift qualified · ${fan.reward_name} · ${money(fan.contribution_minor)}`));
      links(node,action('Release split coin',()=>review('Release split coin',
        `Give ${fan.display_name} one reserved coin for ${fan.target_title}. They keep their original coin for ${fan.title}.`,
        '/split',{serial:fan.serial},result=>`Split coin ${serial(result.serial)} released.`)));
      return node;
    },'Eligible holders appear here after their qualifying gift is funded.');
    group('event-issues',data.issues,ev=>{
      const node=item(ev.title,date.format(new Date(ev.starts_at)));
      node.append(element('p',`${bird(ev.price_bird)} · ${ev.distributed}/${ev.capacity} distributed · ${ev.claimed} claimed`),
        element('p',`${ev.primary_left} available for first sale · ${ev.reserved_left} reserved for splits`));
      return node;
    },'Schedule your first event to create its coins.');
  }

  function render(data) {
    const artist=data.role==='artist';
    $('event-content').hidden=false;
    $('event-signin').hidden=$('event-renew').hidden=true;
    $('event-manage').hidden=$('event-manage-link').hidden=!artist;
    $('event-available').textContent=`${bird(data.wholeBird)} whole gift coins in your wallet`;
    group('event-offers',data.events,eventOffer,'No upcoming events have been released.');
    group('event-listings',data.listings,listing,'There are no fan listings right now.');
    group('event-wallet',data.coins,walletCoin,'Your event coins appear here after a purchase or split.');
    group('event-activity',data.alerts,walletAlert,'No event coin activity yet.');
    if (artist) renderArtist(data);
  }

  async function refresh(force=false) {
    if (refreshing || (working && !force)) return;
    refreshing=true;
    try {
      const data=await request('');
      const initial=!current || $('event-content').hidden;
      if (initial || JSON.stringify(data)!==JSON.stringify(current)) {
        current=data;
        render(data);
      }
      if (initial && !working) showStatus('');
    } finally {
      refreshing=false;
    }
  }

  createForm.addEventListener('submit',event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(createForm));
    if (new Date(values.endsAt)<=new Date(values.startsAt) || new Date(values.startsAt)<=new Date()) {
      showStatus('Schedule a future event with an end time after it begins.','error');
      return;
    }
    if (Number(values.splitReserve)>Number(values.capacity)) {
      showStatus('Reserved entries cannot exceed the event capacity.','error');
      return;
    }
    review('Release event coins',`Schedule ${values.title} with ${values.capacity} event coins at ${bird(values.priceBird)} each. Reserve ${values.splitReserve} for splits.`,
      '/create',{...values,capacity:Number(values.capacity),priceBird:Number(values.priceBird),splitReserve:Number(values.splitReserve),
        startsAt:new Date(values.startsAt).toISOString(),endsAt:new Date(values.endsAt).toISOString()},
      result=>`${result.title} released.`);
  });

  ruleForm.elements.sourceId.addEventListener('change',setTargets);
  ruleForm.addEventListener('submit',event=>{
    event.preventDefault();
    const {sourceId,targetId,goalId,minimum}=Object.fromEntries(new FormData(ruleForm));
    const amount=Math.round(Number(minimum)*100);
    review('Set gift threshold',`Require a contribution of at least ${money(amount)} toward the selected gift. Qualifying fans can receive an extra coin for the later event after your approval.`,
      '/rule',{sourceId,targetId,goalId,minimumMinor:amount},()=> 'Gift threshold published.');
  });

  $('event-refresh').addEventListener('click',()=>refresh().catch(error=>showStatus(error.message,'error')));
  window.setInterval(()=>{
    if (!document.hidden && !$('event-content').hidden && !dialogue.open) refresh().catch(()=>{});
  },15000);
  refresh().catch(error=>showStatus(error.message,'error'));
})();
