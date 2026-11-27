const $ = selector => document.querySelector(selector);
const status = $("#form-status");
const signup = $("#signup-form");
const next=new URLSearchParams(location.search);
const joinPaths={ 'free-fan':['fan','free'], 'paid-fan':['fan','paid'], artist:['artist','paid'] };
function signupTitle() {
  return signup.elements.role.value==='artist'?'Create your artist account':
    signup.elements.tier.value==='paid'?'Join as a paid fan':'Start a free fan account';
}
function mode(create) {
  signup.hidden = !create;
  $("#signin-form").hidden = create;
  $("#show-signin").classList.toggle("selected",!create);
  $("#show-signup").classList.toggle("selected",create);
  $("#show-signin").setAttribute("aria-pressed",String(!create));
  $("#show-signup").setAttribute("aria-pressed",String(create));
  $("#form-title").textContent = create ? signupTitle() : "Welcome back";
  status.textContent = "";
}
$("#show-signin").addEventListener("click",()=>mode(false));
$("#show-signup").addEventListener("click",()=>mode(true));
function membershipFields() {
  const artist = signup.elements.role.value === "artist";
  signup.elements.tier.querySelector('option[value="free"]').disabled = artist;
  if (artist) signup.elements.tier.value = "paid";
  const paid = signup.elements.tier.value === "paid";
  $("#period-field").hidden = !paid;
  signup.elements.period.disabled = !paid;
  if (!signup.hidden) $("#form-title").textContent=signupTitle();
  $("#membership-note").textContent = paid
    ? artist ? "Create your artist account and draft your page. Verified payment is required to publish or stream. Until payment, your account expires after seven days."
      : "After signup, complete membership payment to keep your profile and unlock member live rooms, the wallet, and gifts. Until payment, the profile lasts seven days."
    : "Free account data is deleted seven days after signup. Signing in does not extend that period.";
}
signup.elements.role.addEventListener("change",membershipFields);
signup.elements.tier.addEventListener("change",membershipFields);
for (const [id,route] of [["signin-form","signin"],["signup-form","signup"]]) {
  $("#"+id).addEventListener("submit",async event=>{
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const body = Object.fromEntries(new FormData(form));
    if (route === "signup") body.termsAccepted = form.elements.termsAccepted.checked;
    button.disabled = true;
    status.className = "";
    status.textContent = route === "signup" ? "Creating your account…" : "Signing in…";
    try {
      const response = await fetch(`/api/auth/${route}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result = await response.json();
      if (!response.ok) {
        if (result.field && form.elements[result.field]) {
          form.elements[result.field].focus();
          if (result.code === "USERNAME_TAKEN") form.elements.username.select();
        }
        throw Error(result.error || "Unable to complete the request.");
      }
      let destination='/fan.html';
      if (route==='signup') {
        destination=result.account.role==='artist'?'/artist-setup.html?welcome=1':
          `/fan.html?setup=1#${result.account.membership.requestedTier==='paid'?'membership-panel':'profile-panel'}`;
      }
      if (route==='signin' && next.get('next')==='artist-setup' && result.account.role==='artist') destination='/artist-setup.html';
      if (route==='signin' && next.get('next')==='guide') destination='/arhc-guide.html';
      if (route==='signin' && next.get('next')==='event-market') destination='/event-market.html';
      if (route==='signin' && next.get('next')==='artist-profile') {
        const artist=next.get('artist');
        destination=/^[a-z0-9][a-z0-9_-]{2,31}$/.test(artist || '')? `/artist-profile.html?artist=${encodeURIComponent(artist)}`:'/artists.html';
      }
      if (route==='signin' && next.get('next')==='coin-operations') destination='/coin-operations.html';
      if (route==='signin' && next.get('next')==='artist-live') {
        const artist=next.get('artist');
        destination=next.get('studio')==='1'?'/artist-live.html?studio=1':
          /^[a-z0-9][a-z0-9_-]{2,31}$/.test(artist || '')?`/artist-live.html?artist=${encodeURIComponent(artist)}`:'/artist-live.html';
      }
      location.assign(destination);
    } catch(error) { status.className="error";status.textContent=error.message; }
    finally { button.disabled=false; }
  });
}
const selected=Object.hasOwn(joinPaths,next.get('path'))?joinPaths[next.get('path')]:null;
if (selected) [signup.elements.role.value,signup.elements.tier.value]=selected;
membershipFields();
if (selected || next.get('signup')==='1') mode(true);
