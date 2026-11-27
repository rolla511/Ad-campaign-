(() => {
  const $=id=>document.getElementById(id);
  const base='/api/account/guide';
  const askForm=$('guide-ask');
  const planForm=$('guide-plan');
  const taskList=$('guide-tasks');
  const refreshButton=$('guide-refresh');
  const nextDone=$('guide-next-done');
  const reviewAction=$('guide-review-action');
  const venueOptions={
    music:[['Live music venues','Check whether the room books independent acts and what its typical lineup sounds like.'],
      ['Listening rooms and coffeehouses','Look for acoustic sets, early shows, and a contact for music bookings.'],
      ['Community arts centers','Check the calendar for showcases and calls for local performers.']],
    'open-mic':[['Open mic nights','Check signup times, slot length, and whether accompaniment is available.'],
      ['Spoken word venues','Look for a regular reading series and any theme or age restrictions.'],
      ['Community arts centers','Look for a showcase or space with a stage and an audience for your work.']],
    exhibit:[['Independent art galleries','Look for open calls, submission fees, deadlines, and commission terms.'],
      ['Art markets and pop-up exhibitions','Check table fees, display rules, and application windows.'],
      ['Community arts centers','Look for community shows, exhibition space, and calls for local artists.']]
  };
  let dashboard;
  let preparedAction;
  let busy=false;

  const node=(tag,text)=>{
    const element=document.createElement(tag);
    element.textContent=text;
    return element;
  };

  function status(id,message,error=false) {
    const element=$(id);
    element.textContent=message;
    element.classList.toggle('error',error);
  }

  async function api(path,body) {
    const response=await fetch(base+path,body===undefined?{cache:'no-store'}:{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    const data=await response.json().catch(()=>null);
    if (!response.ok || !data) {
      if (response.status===401) {
        $('guide-content').hidden=true;
        $('guide-status').hidden=false;
        $('guide-signin').hidden=false;
        status('guide-status','Sign in to continue.');
      }
      throw new Error(data?.error || 'ARHC Guide is temporarily unavailable.');
    }
    return data;
  }

  const options=items=>items.map(({id,label})=>new Option(label,id));

  function renderTasks({day,tasks}) {
    const progress=$('guide-task-progress');
    const count=$('guide-task-count');
    const dayLabel=day ? new Intl.DateTimeFormat(undefined,{dateStyle:'long',timeZone:'UTC'}).format(new Date(day)) : null;
    $('guide-task-day').textContent=dayLabel || 'Save a goal to get today’s tasks.';
    progress.hidden=count.hidden=!tasks.length;
    const done=tasks.filter(task=>task.done).length;
    progress.max=tasks.length || 1;
    progress.value=done;
    count.textContent=`${done} of ${tasks.length} completed`;
    const next=tasks.find(task=>!task.done);
    $('guide-next').textContent=next?.label || (tasks.length ?
      'You finished today’s checklist.' : 'Choose a focus to get your first step.');
    const nextLink=$('guide-next-link');
    nextLink.hidden=!next?.action && Boolean(tasks.length);
    nextLink.href=next?.action?.href || '#guide-plan';
    nextLink.textContent=next?.action?.label || 'Choose a focus';
    nextDone.hidden=!next;
    nextDone.dataset.taskId=next?.id || '';
    taskList.replaceChildren(...tasks.map(task=>{
      const item=document.createElement('li');
      const label=document.createElement('label');
      label.className='checkbox';
      const input=document.createElement('input');
      input.type='checkbox';
      input.checked=task.done;
      input.dataset.taskId=task.id;
      label.append(input,node('span',task.label));
      item.append(label);
      return item;
    }));
  }

  const rating=audience=>audience.averageRating===null ? 'Awaiting more ratings' :
    `${audience.averageRating.toFixed(1)} / 5 stars (${audience.ratingBand} ratings)`;

  function renderAudience(audience) {
    $('guide-audience-metrics').replaceChildren(
      node('dt','Average fan rating'),node('dd',rating(audience)),
      node('dt','Followers'),node('dd',audience.followerBand || 'Awaiting more follows')
    );
  }

  function renderMatches(matches,plan,types) {
    status('guide-match-status',matches.length?'':plan?.collaborationType?
      'No matches yet. Suggestions appear here as eligible artists become available.':
      'Choose a collaboration preference to see suggestions.');
    $('guide-matches').replaceChildren(...matches.map(match=>{
      const item=document.createElement('li');
      const heading=document.createElement('h3');
      const profile=node('a',match.displayName);
      profile.href=`/artist-profile.html?artist=${encodeURIComponent(match.username)}`;
      heading.append(profile);
      const date=match.updatedAt?new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(match.updatedAt)):null;
      const reasons=[];
      if (match.overlapBand) reasons.push(`${match.overlapBand} shared followers who opted in`);
      if (match.sharedGenre) reasons.push('Shared genre');
      if (match.compatibleType) reasons.push('Compatible collaboration preference');
      item.append(heading,node('p',date?`${types[match.collaborationType]} · Updated ${date}`:types[match.collaborationType]),
        node('p',reasons.join(' · ')),node('p',`${rating(match.audience)} · ${match.audience.followerBand?
          `${match.audience.followerBand} followers`:'Awaiting more follows'}`));
      return item;
    }));
  }

  function renderArtist(data,{fillPlan=false}={}) {
    if (fillPlan) {
      const {plan}=data;
      planForm.elements.focus.value=plan?.focus || '';
      planForm.elements.goal.value=plan?.goal || '';
      planForm.elements.timeZone.value=plan?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      planForm.elements.collaborationType.value=plan?.collaborationType || '';
    }
    renderTasks(data);
    renderAudience(data.audience);
    renderMatches(data.matches,data.plan,data.collaborationTypes);
  }

  async function refresh() {
    if (busy || document.hidden || $('guide-content').hidden) return;
    busy=true;
    refreshButton.disabled=true;
    try {
      const data=await api('');
      const checklistChanged=data.day!==dashboard.day || JSON.stringify(data.tasks)!==JSON.stringify(dashboard.tasks);
      dashboard=data;
      if (checklistChanged) renderTasks(data);
      renderAudience(data.audience);
      const current=$('guide-matches');
      const activeLink=current.contains(document.activeElement) ? document.activeElement.href : null;
      renderMatches(data.matches,data.plan,data.collaborationTypes);
      if (activeLink) [...current.querySelectorAll('a')].find(link=>link.href===activeLink)?.focus({preventScroll:true});
    } catch (error) {
      status('guide-match-status',error.message,true);
    } finally {
      busy=false;
      refreshButton.disabled=false;
    }
  }

  askForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const button=askForm.querySelector('button');
    button.disabled=true;
    $('guide-answer').hidden=true;
    status('guide-ask-status','Getting your answer…');
    try {
      const result=await api('/ask',{
        question:askForm.elements.question.value,topic:askForm.elements.topic.value,
        useAI:dashboard.aiAvailable && askForm.elements.useAI.checked, focus:dashboard.plan?.focus
      });
      const limitMessage={
        member:'You used your free AI questions for today. Here’s the built-in guide answer.',
        platform:'The ARHC community reached today’s AI limit. Here’s the built-in guide answer.'
      };
      status('guide-ask-status',limitMessage[result.aiLimit] ||
        (result.aiUnavailable?'AI is temporarily unavailable. Here’s the built-in guide answer.':''));
      if (Number.isInteger(result.aiRemaining)) {
        $('ai-allowance').textContent=`${result.aiRemaining} free AI questions remaining today. Resets at midnight UTC.`;
      }
      askForm.elements.useAI.checked=false;
      $('guide-answer-source').textContent=result.source==='openai'?'AI answer':'ARHC help';
      $('guide-answer-text').textContent=result.answer;
      const steps=$('guide-answer-steps');
      steps.replaceChildren(...(result.steps || []).map(step=>node('li',step)));
      steps.hidden=!steps.childElementCount;
      const link=$('guide-answer-link');
      link.href=result.href;
      link.textContent=result.action;
      preparedAction=result.preparedAction;
      reviewAction.hidden=!preparedAction;
      reviewAction.textContent=preparedAction?.type==='review-task'?'Review your next step':'Review a starter plan';
      $('guide-answer').hidden=false;
      $('guide-answer').focus();
    } catch (error) {
      status('guide-ask-status',error.message,true);
    } finally {
      button.disabled=false;
    }
  });

  reviewAction.addEventListener('click',()=>{
    if (preparedAction?.type==='review-task') {
      $('next-title').scrollIntoView();
      if (!nextDone.hidden) nextDone.focus({preventScroll:true});
      return;
    }
    const starter=dashboard.goals.find(goal=>goal.id===preparedAction?.focus);
    if (starter) {
      planForm.elements.focus.value=starter.id;
      planForm.elements.goal.value=starter.starter;
    }
    planForm.scrollIntoView();
    planForm.elements.focus.focus({preventScroll:true});
    status('guide-plan-status','Review the plan and choose Save artist plan to apply it.');
  });

  planForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if (busy) return;
    busy=true;
    const button=planForm.querySelector('button');
    button.disabled=true;
    status('guide-plan-status','Saving your plan…');
    try {
      const values=Object.fromEntries(new FormData(planForm));
      values.collaborationType=values.collaborationType || null;
      dashboard=await api('/plan',values);
      renderArtist(dashboard);
      status('guide-plan-status','Artist plan saved.');
    } catch (error) {
      status('guide-plan-status',error.message,true);
    } finally {
      button.disabled=false;
      busy=false;
    }
  });

  planForm.elements.focus.addEventListener('change',()=>{
    const {focus,goal}=planForm.elements;
    const starter=dashboard.goals.find(option=>option.id===focus.value)?.starter;
    if (starter && (!goal.value.trim() || dashboard.goals.some(option=>option.starter===goal.value))) {
      goal.value=starter;
    }
  });

  async function saveTask(taskId,done,statusId) {
    busy=true;
    taskList.inert=true;
    nextDone.disabled=true;
    status(statusId,'');
    try {
      const data=await api('/task',{day:dashboard.day,taskId,done});
      Object.assign(dashboard,data);
      status(statusId,done?'Step marked complete.':'Step moved back to your checklist.');
    } catch (error) {
      status(statusId,error.message,true);
    } finally {
      renderTasks(dashboard);
      taskList.inert=false;
      nextDone.disabled=false;
      busy=false;
    }
  }

  taskList.addEventListener('change',async event=>{
    const input=event.target;
    if (!input.dataset.taskId) return;
    if (busy) {
      input.checked=!input.checked;
    } else {
      await saveTask(input.dataset.taskId,input.checked,'guide-task-status');
      const nextInput=[...taskList.querySelectorAll('input')].find(task=>task.dataset.taskId===input.dataset.taskId);
      nextInput?.focus({preventScroll:true});
    }
  });

  nextDone.addEventListener('click',()=>{
    if (!busy && nextDone.dataset.taskId) {
      saveTask(nextDone.dataset.taskId,true,'guide-next-status');
    }
  });

  $('guide-venues').addEventListener('submit',event=>{
    event.preventDefault();
    const {city,format}=event.currentTarget.elements;
    const area=city.value.trim();
    const list=$('guide-venue-results');
    if (!area) {
      list.replaceChildren();
      status('guide-venue-status','Enter a city or area to find venues.',true);
      return;
    }
    status('guide-venue-status',`Places to look in ${area}`);
    list.replaceChildren(...venueOptions[format.value].map(([label,tip])=>{
      const item=document.createElement('li');
      const link=node('a',`${label} on Google Maps`);
      const url=new URL('https://www.google.com/maps/search/');
      url.search=new URLSearchParams({api:'1',query:`${label} in ${area}`});
      link.href=url.href;
      link.target='_blank';
      link.rel='noopener noreferrer';
      item.append(link,node('p',tip));
      return item;
    }));
  });

  const outreachForm=$('guide-outreach');
  const outreachText=$('guide-outreach-text');
  const outreachTemplates={
    performance:'I’m reaching out about performing at your venue. I’d love to share a short [describe your set] with your audience. Here’s a sample of my work. [link]\n\nDo you have a booking contact or upcoming dates for independent artists? I’m available [dates].',
    exhibit:'I’m reaching out about showing my work at your space. I’d love to share [describe the work or exhibit]. Here’s a sample of the work. [link]\n\nAre you accepting submissions? I’d be glad to share dimensions, installation details, or dates.',
    collab:'I’m working on [project] and thought your work might be a good fit. I’d love to see if you’re interested in [specific contribution]. Here’s a sample so you can get a feel for it. [link]\n\nWould you be up for a short conversation about the idea and timing?'
  };

  outreachForm.addEventListener('submit',event=>{
    event.preventDefault();
    const {recipient,kind}=outreachForm.elements;
    const greeting=recipient.value.trim() || 'there';
    outreachText.value=`Hi ${greeting},\n\n${outreachTemplates[kind.value]}\n\nThanks,\n[Your artist name]`;
    $('guide-outreach-preview').hidden=false;
    status('guide-outreach-status','');
    outreachText.focus();
  });

  $('guide-copy-outreach').addEventListener('click',async()=>{
    try {
      await navigator.clipboard.writeText(outreachText.value);
      status('guide-outreach-status','Draft copied.');
    } catch {
      outreachText.focus();
      outreachText.select();
      status('guide-outreach-status','The draft is selected. Use your device’s copy command.');
    }
  });

  async function start() {
    try {
      dashboard=await api('');
      askForm.elements.topic.append(...options(dashboard.topics));
      $('ai-choice').hidden=!dashboard.aiAvailable;
      if (dashboard.aiAvailable) {
        $('ai-allowance').textContent=`Up to ${dashboard.aiDailyLimit} free AI questions per day. Resets at midnight UTC.`;
        $('ai-allowance').hidden=false;
      }
      if (dashboard.role==='artist') {
        $('guide-nav').hidden=$('artist-guide').hidden=$('guide-artist-help').hidden=false;
        planForm.elements.focus.append(...options(dashboard.goals));
        planForm.elements.collaborationType.append(...options(Object.entries(dashboard.collaborationTypes).map(([id,label])=>({id,label}))));
        renderArtist(dashboard,{fillPlan:true});
        refreshButton.addEventListener('click',refresh);
        window.setInterval(refresh,60000);
      }
      $('guide-status').hidden=true;
      $('guide-content').hidden=false;
    } catch (error) {
      if ($('guide-signin').hidden) status('guide-status',error.message,true);
    }
  }

  start();
})();
