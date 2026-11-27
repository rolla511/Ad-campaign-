import { visibleCameraSlots } from './artist-live-layout.mjs';

const $=id=>document.getElementById(id);
const status=$('live-status');
const layoutForm=$('layout-form');
const query=new URLSearchParams(location.search);
const studioMode=query.get('studio')==='1';
const artist=query.get('artist')?.trim().toLowerCase();
const liveApi='/api/account/live';
const feeds=new Map();
let roomState, connection, busy=false, polling=false, signedOut=false, clockOffset=0, nextHeartbeat=0, audioEnabled=false;
let refreshTimer, rotationTimer;
let stateVersion=0;
let sdk;

function message(text,error=false) {
  if (status.textContent!==text) status.textContent=text;
  status.className=error?'error':'';
}

async function api(path,body) {
  const options={cache:'no-store'};
  if (body!==undefined) Object.assign(options,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await fetch(path,options);
  const data=await response.json().catch(()=>null);
  if (!response.ok || !data) throw Object.assign(new Error(data?.error || 'The live room is unavailable.'),{status:response.status,code:data?.code});
  return data;
}

function showSignIn() {
  signedOut=true;stopLocal();
  const destination=new URLSearchParams({next:'artist-live'});
  if (studioMode) destination.set('studio','1');
  else if (artist) destination.set('artist',artist);
  $('live-signin').href=`/join.html?${destination}`;
  $('live-signin').hidden=false;
  message('Sign in to open this live room.');
}

function renderFeeds() {
  const visible=visibleCameraSlots([...feeds].filter(([,view])=>!view.track.isMuted).map(([slot])=>slot),roomState,Date.now()+clockOffset);
  $('live-stage').hidden=!visible.length;
  for (const [slot,view] of feeds) view.panel.hidden=!visible.includes(slot);
}

function renderControls() {
  $('connect-camera').disabled=busy || Boolean(connection) || !roomState;
  $('disconnect-camera').disabled=busy;
  $('disconnect-camera').hidden=!connection || !studioMode;
  $('microphone-toggle').hidden=!studioMode || connection?.slot!==1;
  $('microphone-toggle').disabled=busy;
  $('microphone-toggle').textContent=connection?.room.localParticipant.isMicrophoneEnabled?'Mute microphone':'Enable microphone';
  $('end-broadcast').hidden=!roomState?.broadcastId || !studioMode;
  $('end-broadcast').disabled=busy;
  layoutForm.hidden=!roomState?.broadcastId || !studioMode;
  if (roomState && !layoutForm.contains(document.activeElement)) {
    layoutForm.elements.layout.value=roomState.layout;
    layoutForm.elements.rotationSeconds.value=roomState.rotationSeconds;
  }
  $('rotation-field').hidden=layoutForm.elements.layout.value!=='rotate';
  layoutForm.elements.rotationSeconds.disabled=$('rotation-field').hidden;
  layoutForm.querySelector('button').disabled=busy;
  $('watch-live').disabled=busy || Boolean(connection) || !roomState?.slots?.length;
  $('leave-live').hidden=studioMode || !connection;
  $('live-audio-toggle').hidden=studioMode || !connection;
  $('live-audio-toggle').textContent=audioEnabled?'Mute audio':'Enable audio';
  if (studioMode) {
    const text=[1,2,3].map(slot=>`Camera ${slot} · ${connection?.slot===slot?'This device':roomState?.slots?.includes(slot)?'In use':'Available'}`);
    const list=$('camera-slots');
    if (Array.from(list.children,item=>item.textContent).join('|')!==text.join('|')) {
      list.replaceChildren(...text.map(label=>{const item=document.createElement('li');item.textContent=label;return item;}));
    }
  }
  renderFeeds();
}

function clearFeed(slot) {
  const feed=feeds.get(slot);
  if (!feed) return;
  feed.track.detach(feed.video);
  feed.panel.remove();feeds.delete(slot);
}

function stopLocal() {
  const old=connection;
  connection=undefined;
  for (const slot of feeds.keys()) clearFeed(slot);
  const preview=$('live-preview'),audio=$('live-audio');
  preview.srcObject=null;preview.hidden=true;
  audio.srcObject=null;audio.muted=true;audioEnabled=false;
  if (old) old.room.disconnect().catch(()=>{});
  renderControls();
}

function acceptState(snapshot) {
  if (connection && connection.broadcastId!==snapshot.broadcastId) stopLocal();
  roomState=snapshot;
  if (snapshot.serverNow) clockOffset=Date.parse(snapshot.serverNow)-Date.now();
  if (!studioMode && snapshot.displayName) $('room-title').textContent=`${snapshot.displayName} live`;
  renderControls();
}

async function refresh() {
  if (busy || polling || signedOut || (!studioMode && !artist)) return;
  const version=stateVersion;
  polling=true;
  try {
    const heartbeat=studioMode && connection && Date.now()>=nextHeartbeat;
    const data=heartbeat?await api(`${liveApi}/heartbeat`,{broadcastId:connection.broadcastId}):
      await api(`${liveApi}/status${studioMode?'':`?artist=${encodeURIComponent(artist)}`}`);
    if (busy || version!==stateVersion) return;
    if (heartbeat) nextHeartbeat=Date.now()+15000;
    acceptState(data);
    if (studioMode) message(connection?`Camera ${connection.slot} is connected.`:`${data.slots.length} of 3 camera slots in use.`);
    else if (!connection) message(data.slots.length?'A broadcast is open. Select Watch live to join.':'No cameras are live right now.');
    else if (!data.slots.length) message('Waiting for a camera to reconnect.');
    else if (status.textContent==='Waiting for a camera to reconnect.') message('Watching live.');
  } catch (error) {
    if (version!==stateVersion) return;
    if (error.status===401) showSignIn();
    else {
      if ([403,404,409].includes(error.status)) {roomState=undefined;stopLocal();}
      message(error.message,true);
    }
  } finally {polling=false;}
}

async function run(work) {
  if (busy) return;
  stateVersion++;
  busy=true;renderControls();
  try {await work();}
  catch (error) {if (error.status===401) showSignIn();else message(error.message,true);}
  finally {busy=false;renderControls();}
}

async function openRoom(grant,client,slot) {
  acceptState(grant);
  const room=new client.Room({adaptiveStream:true,dynacast:true});
  const current={room,slot,broadcastId:grant.broadcastId};
  connection=current;
  room.on(client.RoomEvent.Disconnected,()=>{
    if (connection!==current) return;
    stopLocal();message('Disconnected. Reopen the live room to reconnect.');
  });
  if (!slot) {
    const slotFor=participant=>Number(/^camera-([123])$/.exec(participant.identity)?.[1]);
    room.on(client.RoomEvent.TrackSubscribed,(track,publication,participant)=>{
      if (connection!==current) return;
      const camera=slotFor(participant);
      if (!camera) return;
      if (track.kind==='audio' && camera===1 && publication.source==='microphone') track.attach($('live-audio'));
      else if (track.kind==='video' && publication.source==='camera') {
        clearFeed(camera);
        const panel=document.createElement('figure'), video=document.createElement('video'), label=document.createElement('figcaption');
        video.autoplay=true;video.playsInline=true;video.muted=true;label.textContent=`Camera ${camera}`;
        panel.style.order=String(camera);panel.append(video,label);$('live-stage').append(panel);
        feeds.set(camera,{track,video,panel});track.attach(video);
      }
      renderFeeds();
    });
    room.on(client.RoomEvent.TrackUnsubscribed,(track,_publication,participant)=>{
      const camera=slotFor(participant);
      if (track.kind==='audio') track.detach($('live-audio'));
      else if (feeds.get(camera)?.track===track) clearFeed(camera);
      renderFeeds();
    });
    room.on(client.RoomEvent.TrackMuted,renderFeeds);
    room.on(client.RoomEvent.TrackUnmuted,renderFeeds);
  }
  try {await room.connect(grant.url,grant.token);}
  catch (error) { if (connection===current) stopLocal();throw error; }
  if (connection!==current) throw new Error('The live connection closed. Try again.');
  return room;
}

const loadSdk=()=>sdk ??= import('/vendor/livekit-client.mjs').catch(error=>{sdk=undefined;throw error;});

$('connect-camera').addEventListener('click',()=>run(async()=>{
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Open this page over HTTPS on a camera-capable device.');
  message('Connecting this camera…');
  const client=await loadSdk();
  const grant=await api(`${liveApi}/camera`,{});
  try {
    const room=await openRoom(grant,client,grant.mySlot);
    const publication=await room.localParticipant.setCameraEnabled(true);
    if (!publication?.track) throw new Error('The camera did not start. Check its permissions and try again.');
    if (connection?.room!==room) throw new Error('The camera disconnected. Try again.');
    const preview=$('live-preview');
    publication.track.attach(preview);preview.hidden=false;
    nextHeartbeat=Date.now()+15000;
    message(`Camera ${grant.mySlot} is connected.${grant.mySlot===1?' You can enable its microphone.':''}`);
  } catch (error) {
    stopLocal();
    await api(`${liveApi}/release`,{broadcastId:grant.broadcastId}).catch(()=>{});
    throw error;
  }
}));

$('disconnect-camera').addEventListener('click',()=>run(async()=>{
  const broadcastId=connection?.broadcastId;
  stopLocal();
  if (broadcastId) await api(`${liveApi}/release`,{broadcastId});
  message('This camera is disconnected.');
}));
$('microphone-toggle').addEventListener('click',()=>run(async()=>{
  if (connection?.slot!==1) return;
  const participant=connection.room.localParticipant;
  await participant.setMicrophoneEnabled(!participant.isMicrophoneEnabled);
}));

layoutForm.elements.layout.addEventListener('change',()=>{
  $('rotation-field').hidden=layoutForm.elements.layout.value!=='rotate';
  layoutForm.elements.rotationSeconds.disabled=$('rotation-field').hidden;
});
layoutForm.addEventListener('submit',event=>{
  event.preventDefault();
  const layout=layoutForm.elements.layout.value;
  const data={broadcastId:roomState?.broadcastId,layout,rotationSeconds:layout==='rotate'?Number(layoutForm.elements.rotationSeconds.value):roomState?.rotationSeconds ?? 12};
  run(async()=>{acceptState(await api(`${liveApi}/layout`,data));message('Viewer layout saved.');});
});
$('end-broadcast').addEventListener('click',()=>{
  const dialog=$('end-confirmation');
  dialog.returnValue='cancel';dialog.showModal();
});
$('end-confirmation').addEventListener('close',event=>{
  if (event.target.returnValue!=='end') return;
  run(async()=>{
    await api(`${liveApi}/end`,{broadcastId:roomState?.broadcastId});
    roomState=undefined;stopLocal();message('Broadcast ended for all devices.');
  });
});
$('watch-live').addEventListener('click',()=>run(async()=>{
  message('Joining the live room…');
  const client=await loadSdk();
  const grant=await api(`${liveApi}/join`,{artist,broadcastId:roomState.broadcastId});
  await openRoom(grant,client);
  message('Watching live. Enable audio to hear the stream.');
}));
$('leave-live').addEventListener('click',()=>{stateVersion++;stopLocal();message('You left the room.');});
$('live-audio-toggle').addEventListener('click',()=>run(async()=>{
  if (!connection) return;
  if (!audioEnabled) await connection.room.startAudio();
  audioEnabled=!audioEnabled;$('live-audio').muted=!audioEnabled;
}));

async function init() {
  if (!studioMode && !artist) {
    $('find-room').hidden=false;message('Find an artist’s live room by username.');return;
  }
  if (studioMode) {
    try {
      const {account}=await api('/api/auth/me');
      if (!account.permissions.manageArtistPage) {message('An active paid artist account is required.',true);return;}
      $('room-title').textContent='Artist live studio';
      $('viewer-link').href=`/artist-live.html?artist=${encodeURIComponent(account.username)}`;
      $('studio').hidden=false;
    } catch (error) {if (error.status===401) showSignIn();else message(error.message,true);return;}
  } else $('viewer').hidden=false;
  await refresh();
  refreshTimer=setInterval(refresh,4000);
  if (!studioMode) rotationTimer=setInterval(renderFeeds,250);
}

window.addEventListener('pagehide',()=>{stateVersion++;clearInterval(refreshTimer);clearInterval(rotationTimer);stopLocal();});
window.addEventListener('pageshow',event=>{if (event.persisted) init();});
init();
