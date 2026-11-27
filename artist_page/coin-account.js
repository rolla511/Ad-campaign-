(() => {
  const $=selector=>document.querySelector(selector);
  const status=$("#wallet-status");
  let account,wallet,market;
  const money=minor=>new Intl.NumberFormat(undefined,{style:"currency",currency:"USD"}).format(Number(minor)/100);
  const coinNames={lion_crown:'Lion and Crown',bird_bee:'Bird and Bee'};
  const histories={
    'coin.purchase.verified':'Purchase verified','coin.artist.trade.completed':'Artist trade','coin.gift.contribution.created':'Gift contribution',
    'coin.event.primary.completed':'Artist event coin sale','coin.event.resale.completed':'Fan event coin trade',
    'coin.redemption.requested':'Coins reserved','coin.redemption.completed':'Conversion paid','coin.redemption.rejected':'Coins returned to wallet'
  };
  async function request(path,body) {
    const response=await fetch("/api/account/coins/"+path,body===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error || "The coin request could not be completed.");
    return result;
  }
  function element(tag,text,className) {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
  function selectOptions(select,items,label) {
    const previous=select.value;select.replaceChildren();
    const blank=element("option",label);blank.value="";select.append(blank);
    for(const item of items){const option=element("option",item.label);option.value=item.id;select.append(option);}
    if(items.some(item=>item.id===previous))select.value=previous;
  }
  function purchasePrice() {
    if(!wallet)return;
    const form=$("#coin-purchase-form");const price=wallet.prices.find(row=>row.coin===form.elements.coin.value);
    const total=Number(price?.price_minor)*Number(form.elements.quantity.value);
    $("#coin-purchase-price").textContent=price?.price_minor ? `${money(price.price_minor)} per coin · ${money(total)} total` : "The platform has not published this coin's purchase price yet.";
    const estimate=$("#coin-purchase-estimate");
    estimate.hidden=!price?.price_minor || !form.elements.quantity.validity.valid;
    estimate.textContent=price?.coin==='lion_crown'
      ? `An eligible trade using this purchase could produce ${money(total/2)} in Bird and Bee gift credit.`
      : 'Bird and Bee is artist inventory. Gift credit is set when a member trades Lion and Crown for an offer.';
    form.querySelector("button").disabled=!account.membership.active || !price?.price_minor;
  }
  async function action(node,work) {
    const button=node.tagName==="BUTTON" ? node : node.querySelector('button[type="submit"],button');
    if(button)button.disabled=true;status.className="";status.textContent="Submitting…";
    try{await work();delete node.dataset.operationKey;await refresh();}
    catch(error){status.className="error";status.textContent=error.message;}
    finally{if(button)button.disabled=!account.membership.active;purchasePrice();if(wallet)giftFormState();}
  }
  const key=node=>node.dataset.operationKey ||= crypto.randomUUID();
  function renderHistory(artist) {
    const history=$("#wallet-growth"), purchases=$("#wallet-purchases");
    history.replaceChildren();purchases.replaceChildren();
    for (const heading of document.querySelectorAll('.artist-wallet-column')) heading.hidden=!artist;
    for (const entry of wallet.history) {
      const row=element('tr');
      row.append(element('td',`${histories[entry.type]} · ${new Date(entry.created_at).toLocaleString()}`),
        element('td',money(entry.balances.tradeBasisMinor)),element('td',money(entry.balances.giftCreditMinor)));
      if (artist) row.append(element('td',money(entry.balances.redemptionValueMinor)));
      history.append(row);
    }
    $("#wallet-growth-table").hidden=!wallet.history.length;
    $("#wallet-growth-empty").textContent=wallet.history.length?'':'New balance changes will appear here.';
    for (const order of wallet.purchases) {
      purchases.append(element('li',`${order.quantity.toLocaleString()} ${coinNames[order.coin]} · ${money(order.amount_minor)} paid · ${new Date(order.paid_at).toLocaleDateString()}`));
    }
    if (!wallet.purchases.length) purchases.append(element('li','No verified coin purchases yet.','muted'));
  }
  function previewTrade(offer) {
    let remaining=offer.lion_quantity;
    let basis=0;
    for (const lot of wallet.lots) {
      if (lot.bucket!=='fan_spend') continue;
      const used=Math.min(remaining,lot.quantity);
      basis+=used*lot.unit_value_minor;
      remaining-=used;
      if (!remaining) break;
    }
    if (remaining) return 'You need more Lion and Crown to accept this offer.';
    if (!Number.isSafeInteger(basis/2) || basis/2%offer.bird_quantity) return 'The value of your available coins cannot be split exactly for this offer.';
    return `Estimated gift credit from your coins: ${money(basis/2)}.`;
  }
  const giftRemaining=goal=>Math.max(0,Number(goal.target_minor)-Number(goal.funded_minor));
  function giftFormState() {
    const form=$('#artist-gift-form');
    const goal=market.goals.find(item=>item.id===form.elements.goalId.value && item.status==='funding');
    const max=goal?Math.min(wallet.birdBeeGiftValueMinor,giftRemaining(goal)):0;
    form.elements.amount.max=(max/100).toFixed(2);
    form.elements.amount.disabled=!account.membership.active || !max;
    form.querySelector('button').disabled=form.elements.amount.disabled;
    $('#selected-gift-balance').textContent=goal?`${money(giftRemaining(goal))} left on this gift · ${money(wallet.birdBeeGiftValueMinor)} gift credit in your wallet.`:
      `Choose a wishlist gift. You have ${money(wallet.birdBeeGiftValueMinor)} in Bird and Bee gift credit.`;
  }
  function render() {
    const balances=$("#wallet-balances");balances.replaceChildren();
    const artist=account.role==="artist";
    const positions=[['Lion and Crown available',wallet.lionCrown],['Original purchase value held',money(wallet.lionCrownTradeBasisMinor)],
      ['Potential gift credit with eligible trades',money(wallet.lionCrownTradeBasisMinor/2)],['Bird and Bee gift credit',money(wallet.birdBeeGiftValueMinor)]];
    if (artist) positions.push(['Bird and Bee inventory',wallet.birdBeeInventory],['Eligible artist conversion at half value',money(wallet.liquidationValueMinor)]);
    for (const [label,value] of positions) {
      const item=element('div',undefined,'wallet-balance');
      item.append(element('dt',label),element('dd',String(value)));balances.append(item);
    }
    renderHistory(artist);
    $("#artist-offer-section").hidden=!artist;$("#redemption-section").hidden=!artist;
    $("#artist-wishlist-section").hidden=!artist;
    const inventoryOption=$("#coin-purchase-form").elements.coin.querySelector('option[value="bird_bee"]');inventoryOption.disabled=!artist;
    if(!artist)$("#coin-purchase-form").elements.coin.value="lion_crown";
    for(const button of $("#coin-wallet").querySelectorAll('form button'))button.disabled=!account.membership.active;
    const offers=$("#artist-market-offers");offers.replaceChildren();
    if(!market.offers.length)offers.append(element("p","No artist offers have been published yet.","muted"));
    for(const offer of market.offers){
      const card=element("article",undefined,"market-item");card.append(element("strong",`${offer.title} · ${offer.display_name}`),element("p",offer.benefit_description || offer.benefit_type),element("p",`Pay ${offer.lion_quantity} Lion and Crown; receive ${offer.bird_quantity} Bird and Bee plus the artist's offered benefit.`),element('p',previewTrade(offer),'muted'));
      const button=element("button","Accept artist offer","secondary");button.type="button";button.disabled=!account.membership.active || offer.artist_id===account.id;
      button.addEventListener("click",()=>action(button,async()=>{const result=await request("trade",{offerId:offer.id,operationKey:key(button)});status.textContent=`Trade complete. Store credit: ${money(result.birdBeeGiftValueMinor)}. The artist's content or interaction still requires fulfillment.`;}));card.append(button);offers.append(card);
    }
    selectOptions($("#artist-wishlist-form").elements.rewardId,market.rewards.map(item=>({id:item.id,label:`${item.name} · ${money(item.price_minor)} venue value` })),"Choose from the platform catalog");
    const giftForm=$("#artist-gift-form");
    selectOptions(giftForm.elements.goalId,market.goals.filter(goal=>goal.status==='funding').map(goal=>({id:goal.id,label:`${goal.display_name} · ${goal.reward_name} · ${money(giftRemaining(goal))} left` })),"Choose an artist's selected gift");
    const goals=$("#artist-gift-goals");goals.replaceChildren();
    for (const goal of market.goals) {
      const card=element('article',undefined,'market-item');
      const remaining=giftRemaining(goal);
      card.append(element('strong',goal.reward_name),element('p',`Selected by ${goal.display_name}`,'muted'),
        element('p',goal.status==='fulfilled'?'Fulfilled':remaining?`${money(remaining)} left`:'Fully funded'),
        element('p',`${money(goal.funded_minor)} funded of ${money(goal.target_minor)}`,'muted'));
      const progress=element('progress');progress.max=Number(goal.target_minor);progress.value=Number(goal.funded_minor);
      progress.setAttribute('aria-label',`${goal.display_name}'s ${goal.reward_name} funding`);card.append(progress);
      if (goal.status==='funding' && account.membership.active && wallet.birdBeeGiftValueMinor>0) {
        const support=element('button','Contribute to this gift','secondary');support.type='button';
        support.addEventListener('click',()=>{
          delete giftForm.dataset.operationKey;giftForm.elements.goalId.value=goal.id;giftForm.elements.amount.value='';
          giftFormState();giftForm.elements.amount.focus();
        });card.append(support);
      }
      goals.append(card);
    }
    giftFormState();
    if(!market.goals.length)goals.append(element("p","Artists have not selected wishlist gifts yet.","muted"));
    const activity=$("#coin-activity");activity.replaceChildren();
    for(const benefit of wallet.benefits){
      const card=element("article",undefined,"market-item");card.append(element("strong",benefit.title),element("p",`${benefit.benefit_description} · ${benefit.status.replaceAll("_"," ")}`));
      if(benefit.fulfillment_reference)card.append(element("p",benefit.fulfillment_reference));
      if(benefit.artist_id===account.id && benefit.status!=='fulfilled'){
        const form=element("form");const label=element("label","Content, message, or session fulfillment reference");const input=element("input");input.required=true;input.maxLength=2000;label.append(input);const button=element("button","Record fulfillment","secondary");button.type="submit";button.disabled=!account.membership.active;form.append(label,button);
        form.addEventListener("submit",event=>{event.preventDefault();action(form,async()=>{await request("benefits/fulfill",{receiptId:benefit.id,reference:input.value});status.textContent="Artist benefit marked fulfilled.";});});card.append(form);
      }
      activity.append(card);
    }
    for(const gift of wallet.gifts)activity.append(element("p",`${gift.reward_name} · ${money(gift.value_minor)} · ${gift.status.replaceAll("_"," ")}`));
    for(const contribution of wallet.contributions)activity.append(element("p",`You contributed ${money(contribution.value_minor)} toward ${contribution.reward_name} · ${money(contribution.funded_minor)} of ${money(contribution.target_minor)} funded`));
    for(const redemption of wallet.redemptions)activity.append(element("p",`${redemption.lion_quantity} Lion and Crown · ${money(redemption.cash_value_minor)} · ${redemption.status.replaceAll("_"," ")}`));
    if(!wallet.gifts.length && !wallet.redemptions.length && !wallet.benefits.length && !wallet.contributions.length)activity.append(element("p","Your artist benefits, gift contributions, and conversion requests will appear here.","muted"));
    purchasePrice();
    $("#coin-wallet").hidden=false;
  }
  async function refresh(){const result=await request("wallet");wallet=result.wallet;market=result.market;render();}
  $("#refresh-wallet").addEventListener('click',async event=>{
    const button=event.currentTarget;button.disabled=true;
    try {await refresh();status.className='';status.textContent='Wallet and wishlist balances updated.';}
    catch(error){status.className='error';status.textContent=error.message;}
    finally {button.disabled=false;}
  });
  $("#coin-purchase-form").addEventListener("input",purchasePrice);
  $("#coin-purchase-form").addEventListener("submit",event=>{
    event.preventDefault();const form=event.currentTarget;
    action(form,async()=>{const order=await request("checkout",{coin:form.elements.coin.value,quantity:Number(form.elements.quantity.value)});if(!order.approvalUrl)throw Error("Checkout is unavailable.");location.assign(order.approvalUrl);});
  });
  $("#artist-offer-form").addEventListener("submit",event=>{
    event.preventDefault();const form=event.currentTarget;
    action(form,async()=>{await request("offers",{title:form.elements.title.value,benefitType:form.elements.benefitType.value,benefitDescription:form.elements.benefitDescription.value,lionQuantity:Number(form.elements.lionQuantity.value),birdQuantity:Number(form.elements.birdQuantity.value)});form.reset();status.textContent="Your artist offer is published. Purchase enough Bird and Bee inventory before fans accept it.";});
  });
  $("#artist-gift-form").addEventListener("submit",event=>{
    event.preventDefault();const form=event.currentTarget;
    action(form,async()=>{const result=await request("gifts/contribute",{goalId:form.elements.goalId.value,amountMinor:Math.round(Number(form.elements.amount.value)*100),operationKey:key(form)});status.textContent=`Contributed ${money(result.valueMinor)} toward ${result.rewardName}. ${result.status==='funded'?'The gift is fully funded and awaits fulfillment.':'Other fans can add to the remaining value.'} Spent Bird and Bee returned to ARC.`;});
  });
  $("#artist-gift-form").elements.goalId.addEventListener('change',()=>{
    $("#artist-gift-form").elements.amount.value='';giftFormState();
  });
  $("#artist-wishlist-form").addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget;action(form,async()=>{await request("gifts/goals",{rewardId:form.elements.rewardId.value});status.textContent="Your selected platform gift is on your wishlist.";});});
  $("#coin-redemption-form").addEventListener("submit",event=>{
    event.preventDefault();const form=event.currentTarget;
    action(form,async()=>{const result=await request("redemptions",{quantity:Number(form.elements.quantity.value),acceptHalfValue:form.elements.acceptHalfValue.checked,operationKey:key(form)});status.textContent=`${money(result.cashValueMinor)} conversion requested. The coins are reserved pending review and actual payout.`;});
  });
  for(const form of [$("#artist-gift-form"),$("#coin-redemption-form")])form.addEventListener("input",()=>delete form.dataset.operationKey);
  window.addEventListener("arhc:account",async event=>{account=event.detail;try{await refresh();}catch(error){status.className="error";status.textContent=error.message;}});
})();
