const $ = id => document.getElementById(id);
const endpoint = '/api/account/coins/operator';
const refreshDelay = 2_000;
const coinNames = { lion_crown: 'Lion and Crown', bird_bee: 'Bird and Bee', artist_event:'Artist event' };
const locations = { wallet: 'Member wallet', redemption: 'Reserved for redemption', treasury: 'ARC treasury' };
const eventLocations = {primary:'Artist release',reserved:'Artist split reserve',held:'Member wallet',claimed:'Event access claimed'};
const issueNames = {
  holder: 'Holder', lot: 'Lot', lotIsSerialized: 'Registered lot', serialsMatchLot: 'Serials match lot',
  recordedQuantity: 'Recorded quantity', locatedQuantity: 'Located quantity',
  recordedCreditMinor: 'Recorded credit (cents)', locatedCreditMinor: 'Located credit (cents)',
  locatedSerials: 'Located serials', issuedThrough: 'Issued through', highestLocatedSerial: 'Highest located serial'
};
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
let watch;
let balanceRequest;
let staffMode = false;

function report(id, message, className = '') {
  const node = $(id);
  if (node.textContent !== message) node.textContent = message;
  node.className = className;
}

const date = value => value == null ? '—' : dateFormatter.format(new Date(value));
const quantity = value => value == null ? '—' : String(value).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const count = value => BigInt(value).toLocaleString();

async function read(path = '', signal, body) {
  const options = { cache: 'no-store', signal, headers: { Accept: 'application/json' } };
  if (body !== undefined) {
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(endpoint + path, options);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw Object.assign(new Error(data?.error || 'The coin service is unavailable. Try again.'), { status: response.status, code: data?.code });
  }
  return data;
}

function stopWatching() {
  if (watch) {
    clearTimeout(watch.timer);
    watch.controller.abort();
    watch = undefined;
  }
  $('stop-watch').hidden = true;
}

function clearWorkspace() {
  stopWatching();
  balanceRequest?.abort();
  $('operator-workspace').hidden = true;
  $('locator-result').hidden = true;
  $('locator-details').replaceChildren();
  $('locator-checked').textContent = '';
  $('reconcile-table').hidden = true;
  $('reconcile-issues').replaceChildren();
  $('reconcile-checked').textContent = '';
  report('locator-status', 'Enter a serial to see where the coin is now. Artist event serials start with E.');
  report('reconcile-status', '');
}

function accessError(error) {
  clearWorkspace();
  const signIn = error.status === 401;
  if (error.code === 'OPERATOR_SIGN_IN_REQUIRED') staffMode = true;
  $('member-account-link').hidden = staffMode;
  $('operator-signout').hidden = true;
  $('operator-login').hidden = !signIn || !staffMode;
  $('operator-signin').hidden = !signIn || staffMode;
  $('retry-access').hidden = signIn || error.status === 403;
  const message = signIn ? 'Sign in with your ARC operator account.' : error.message;
  report('access-status', message, 'error');
}

async function checkAccess() {
  $('retry-access').hidden = true;
  $('operator-signin').hidden = true;
  report('access-status', 'Checking access…');
  try {
    const result = await read();
    staffMode = result.mode === 'operator';
    $('member-account-link').hidden = staffMode;
    $('operator-signout').hidden = !staffMode;
    $('operator-login').hidden = true;
    report('access-status', '');
    $('operator-workspace').hidden = false;
  } catch (error) { accessError(error); }
}

function renderCoin(coin,eventCoin) {
  const details = $('locator-details');
  details.replaceChildren();
  $('locator-result').hidden = !coin && !eventCoin;
  if (!coin && !eventCoin) return;
  const event=eventCoin?.coin;
  $('locator-state').textContent = event ? `${eventLocations[event.state]} · ${event.title} · E${event.serial}` :
    `${locations[coin.location]} · ${coinNames[coin.coin]} #${coin.serial}`;
  const fields = event ? [
    ['Current holder ID',event.holder_id],['Holder acquired',date(event.holder_since)],
    ['Original event issue',event.issue_id],['Issuing artist ID',event.artist_id],
    ['Parent coin',event.source_serial ? `E${event.source_serial}` : null],['Split transaction',event.split_reference],
    ['Qualifying gift',event.gift_goal_id],['Gift contribution transactions',event.contribution_ids?.join(', ')],
    ['Latest transaction',eventCoin.movements?.at(-1)?.reference_id]
  ] : [
    ['Current holder ID', coin.holder_id], ['Holder acquired', date(coin.acquired_at)],
    ['Quantity outside treasury', quantity(coin.available_quantity)], ['Treasury quantity', quantity(coin.treasury_quantity)],
    ['Original order', coin.source_order_id ?? 'Unknown'], ['Original payment capture', coin.source_capture_id],
    ['Circulation order', coin.cycle_order_id], ['Circulation account ID', coin.cycle_account_id],
    ['Circulation started', date(coin.cycle_acquired_at)], ['Latest transaction', coin.transaction_reference]
  ];
  if (coin?.credit_minor != null) fields.splice(4, 0, ['Remaining gift credit (cents)', coin.credit_minor]);
  for (const [label, value] of fields) {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value ?? '—';
    details.append(term, description);
  }
}

async function refreshLocation(active) {
  if (watch !== active || document.hidden || active.pending) return;
  active.pending = true;
  try {
    const { coin, eventCoin, checkedAt } = await read(`/location?serial=${encodeURIComponent(active.serial)}`, active.controller.signal);
    if (watch !== active) return;
    $('locator-checked').textContent = `Last checked ${date(checkedAt)}`;
    const snapshot = JSON.stringify(coin || eventCoin || null);
    if (snapshot !== active.snapshot) renderCoin(coin,eventCoin);
    active.snapshot = snapshot;
    const location=coin ? locations[coin.location] : eventLocations[eventCoin?.coin?.state];
    report('locator-status', location ? `Watching coin ${active.serial}. ${location}.` : `Coin ${active.serial} has no registry record yet. Watching for issuance.`);
  } catch (error) {
    if (watch !== active) return;
    if (error.status === 401 || error.status === 403) accessError(error);
    else if (error.status === 400) {
      stopWatching();
      report('locator-status', error.message, 'error');
    } else report('locator-status', 'Refresh failed. Showing the last successful check while retrying.', 'error');
  } finally {
    active.pending = false;
    if (watch === active && !document.hidden) active.timer = setTimeout(() => refreshLocation(active), refreshDelay);
  }
}

$('locator-form').addEventListener('submit', event => {
  event.preventDefault();
  stopWatching();
  renderCoin(null);
  const serial = $('coin-serial').value.toUpperCase();
  $('locator-checked').textContent = '';
  if (BigInt(serial.replace(/^E/,'')) > 9223372036854775807n) {
    report('locator-status', 'Enter a valid coin serial number.', 'error');
    return;
  }
  report('locator-status', `Looking up coin #${serial}…`);
  watch = { serial, controller: new AbortController() };
  $('stop-watch').hidden = false;
  refreshLocation(watch);
});
$('stop-watch').addEventListener('click', () => {
  stopWatching();
  report('locator-status', 'Watch stopped. The last successful location is shown below.');
  $('coin-serial').focus();
});
document.addEventListener('visibilitychange', () => {
  if (!watch) return;
  clearTimeout(watch.timer);
  if (!document.hidden) refreshLocation(watch);
});

function issueRow(issue) {
  const row = document.createElement('tr');
  for (const value of [issue.area, coinNames[issue.coin] ?? '—', issue.reference]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  const detail = document.createElement('td');
  const list = document.createElement('ul');
  for (const [key, value] of Object.entries(issue.detail)) {
    const item = document.createElement('li');
    item.textContent = `${issueNames[key] ?? key}: ${quantity(value)}`;
    list.append(item);
  }
  detail.append(list);
  row.append(detail);
  return row;
}

$('run-reconcile').addEventListener('click', async () => {
  const button = $('run-reconcile');
  const controller = new AbortController();
  balanceRequest = controller;
  button.disabled = true;
  $('reconcile-table').hidden = true;
  $('reconcile-issues').replaceChildren();
  $('reconcile-checked').textContent = '';
  report('reconcile-status', 'Checking storage balances…');
  try {
    const result = await read('/reconcile', controller.signal);
    if (controller.signal.aborted) return;
    const registered = count(result.registeredSerials);
    const eventSerials=count(result.registeredEventSerials ?? '0');
    if (result.balanced) report('reconcile-status', `Balanced. ${registered} platform serials and ${eventSerials} event serials checked.`, 'success');
    else {
      const shown = BigInt(result.issueCount) > BigInt(result.issues.length) ? ` Showing the first ${result.issues.length}.` : '';
      report('reconcile-status', `Found ${count(result.issueCount)} balance differences.${shown}`, 'error');
      $('reconcile-issues').replaceChildren(...result.issues.map(issueRow));
      $('reconcile-table').hidden = false;
    }
    $('reconcile-checked').textContent = `Checked ${date(result.checkedAt)}`;
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error.status === 401 || error.status === 403) accessError(error);
    else report('reconcile-status', error.message, 'error');
  } finally {
    if (balanceRequest === controller) balanceRequest = undefined;
    button.disabled = false;
  }
});

$('retry-access').addEventListener('click', checkAccess);
$('operator-login').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await read('/session',undefined,Object.fromEntries(new FormData(form)));
    form.reset();
    await checkAccess();
  } catch (error) {
    form.elements.password.value = '';
    report('access-status',error.message,'error');
  } finally { button.disabled = false; }
});
$('operator-signout').addEventListener('click', async () => {
  try {await read('/signout',undefined,{});await checkAccess();}
  catch (error) {report('access-status',error.message,'error');}
});
window.addEventListener('pagehide', clearWorkspace);
window.addEventListener('pageshow', event => { if (event.persisted) checkAccess(); });
checkAccess();
