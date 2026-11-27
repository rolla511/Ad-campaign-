const $ = selector=>document.querySelector(selector);
let account;
let plans=[];
async function api(route,body) {
  const response=await fetch(route,body === undefined ? {} : {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const result=await response.json();
  if(response.status===401){location.replace('/join.html');throw Error("Sign in to continue.");}
  if(!response.ok)throw Error(result.error || "The request could not be completed.");
  return result;
}
function date(value){return value ? new Date(value).toLocaleString() : "Not active";}
function price(){
  const period=$("#membership-form").elements.period.value;
  const plan=plans.find(plan=>plan.period===period);
  $("#membership-price").textContent=plan?.amount ? `${new Intl.NumberFormat(undefined,{style:"currency",currency:plan.currency}).format(plan.amount)} per ${period}` : "Membership pricing will be available soon. You have not been charged.";
  $("#checkout-button").disabled=!plan?.amount;
}
function render(){
  const paid=account.membership.tier==="paid";
  $("#welcome").textContent=`Welcome, ${account.displayName}`;
  $("#username").textContent=account.username;
  $("#role").textContent=account.role==="artist" ? "Artist" : "Fan / listener";
  $("#standing").textContent="Good standing";
  $("#tier-badge").textContent=paid ? "Lasting member profile" : "Seven-day free profile";
  $("#membership-state").textContent=account.membership.active ? "Paid · active" : paid ? "Paid membership expired · profile retained" : account.membership.requestedTier==="paid" ? "Payment pending" : "Free";
  $("#expiry-label").textContent=paid ? "Member features through" : "Free profile expires";
  $("#expiry").textContent=date(paid ? account.membership.paidUntil : account.membership.freeExpiresAt);
  $("#retention-message").textContent=paid ? "Your profile is stored long term. Continue signing in while your account remains in good standing." : `Your free account and its profile data will be deleted on ${date(account.membership.freeExpiresAt)}. Signing in does not extend this deadline. Complete paid membership before then to keep your profile.`;
  $("#membership-description").textContent=account.role==="artist" ? "Artists require active paid membership to publish and participate in member transactions." : "Paid membership keeps your profile and unlocks eligible member features while active.";
  $("#coin-status").textContent=account.permissions.coinTrade ? "Your active membership meets the membership requirement for coin participation." : "Coin participation is unavailable to free accounts or inactive memberships. You can still view content artists mark free.";
  $("#artist-studio-link").hidden=!account.permissions.manageArtistPage;
  $("#artist-page-setup-link").hidden=account.role!=='artist';
  $("#profile-form").elements.displayName.value=account.displayName;
  $("#profile-form").elements.bio.value=account.profile.bio || "";
  $("#profile-form").elements.favoriteGenres.value=account.profile.favoriteGenres || "";
  $("#account-content").hidden=false;
  price();
  window.dispatchEvent(new CustomEvent("arhc:account",{detail:account}));
}
$("#profile-form").addEventListener("submit",async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector("button");button.disabled=true;
  const status=$("#profile-status");status.className="";
  try{const result=await api("/api/account/profile",Object.fromEntries(new FormData(event.currentTarget)));account=result.account;render();status.className="success";status.textContent="Your profile has been saved.";}
  catch(error){status.className="error";status.textContent=error.message;}finally{button.disabled=false;}
});
$("#membership-form").elements.period.addEventListener("change",price);
$("#membership-form").addEventListener("submit",async event=>{
  event.preventDefault();$("#checkout-button").disabled=true;const status=$("#checkout-status");status.textContent="Opening membership payment…";
  try{const result=await api("/api/account/membership/checkout",{period:event.currentTarget.elements.period.value});if(!result.approvalUrl)throw Error("Checkout is temporarily unavailable.");location.assign(result.approvalUrl);}
  catch(error){status.className="error";status.textContent=error.message;price();}
});
$("#signout").addEventListener("click",async()=>{try{await api("/api/auth/signout",{});location.assign("/");}catch(error){$("#page-status").textContent=error.message;}});
async function load(){
  try{
    const result=await api("/api/auth/me");account=result.account;plans=result.plans;
    if (account.membership.period) $("#membership-form").elements.period.value=account.membership.period;
    const params=new URLSearchParams(location.search);
    const status=$("#page-status");
    if(params.get("checkout")==="cancelled") {
      render();status.textContent="Checkout was cancelled.";
      history.replaceState({},"","/fan.html");
      return;
    }
    if(params.has("token")){
      const coinPurchase=params.get("purchase")==="coins";
      status.textContent=coinPurchase ? "Verifying coin payment…" : "Verifying membership payment…";
      try {
        const verified=await api(coinPurchase ? "/api/account/coins/capture" : "/api/account/membership/capture",{orderId:params.get("token")});
        if(verified.account)account=verified.account;
        history.replaceState({},"","/fan.html");
        status.className="success";
        status.textContent=coinPurchase ? "Coin payment verified. Your purchase appears in your wallet." : "Membership payment verified.";
      } catch (error) {
        status.className="error";
        status.textContent=`${error.message} Reload this page to retry verification.`;
      }
    } else {
      status.textContent="";
    }
    render();
    if (params.get('setup')==='1') requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }catch(error){$("#page-status").className="error";$("#page-status").textContent=error.message;}
}
load();
