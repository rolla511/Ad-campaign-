const STORAGE_KEY = "index-audio-entry-v2";
const RUNTIME_API = location.protocol.startsWith("http") ? "/api" : null;

const plans = {
  platform: {
    name: "Platform Access",
    price: 45,
    features: ["artist page", "music uploads", "streaming access", "launch dashboard", "support"]
  },
  protection: {
    name: "Index Protection",
    price: 90,
    features: ["index searches", "audio fingerprint enforcement", "off-platform tracking", "royalty request log", "support"]
  }
};

const distributionPlans = {
  yearly: {
    name: "Distribution Annual",
    price: 90,
    period: "year"
  },
  monthly: {
    name: "Distribution Monthly",
    price: 10,
    period: "month"
  }
};

const covers = [
  "linear-gradient(135deg, #17201b, #1d7d59 48%, #d89b27)",
  "radial-gradient(circle at 25% 25%, #f7f8f3, #285c8c 38%, #17201b 72%)",
  "linear-gradient(160deg, #be4f3d, #d89b27 46%, #1d7d59)",
  "conic-gradient(from 120deg, #285c8c, #1d7d59, #d89b27, #be4f3d, #285c8c)"
];

const initialState = {
  subscriber: {
    artistName: "Demo Artist",
    email: "artist@example.com",
    genre: "R&B",
    goal: "Track royalties",
    plan: "platform",
    trackingConsent: true,
    ownershipAttestation: true,
    createdAt: new Date().toISOString()
  },
  basic: {
    accountModel: "Creator customer/partner",
    monetizationEnabled: true,
    sellMusicEnabled: true,
    liveVideoEnabled: true,
    liveAudioRadioEnabled: true,
    canUseIndexScanning: false,
    includedArtistSubscriptions: 50,
    usedArtistSubscriptions: 0,
    artistSubscriptionPrice: 4.99,
    stationName: "Demo Artist Radio",
    audience: "18+ only",
    acceptPlatformSubscribers: true,
    captchaEnabled: true,
    minorSafeTerms: true,
    adultTerms: true,
    exchanges: []
  },
  fans: {
    profiles: [
      {
        id: crypto.randomUUID(),
        displayName: "Demo Listener",
        email: "fan@example.com",
        experience: "Listen to new music",
        visibility: "Public basic profile",
        genres: ["R&B", "Live studio sessions"],
        expectationNote: "Warm live sessions, early listens, and artists who talk through the music.",
        searchConsent: true,
        createdAt: new Date().toISOString()
      }
    ],
    tips: []
  },
  cloud: {
    leases: []
  },
  promotion: {
    active: false,
    monthlyPrice: 5.99,
    profiles: [
      {
        id: crypto.randomUUID(),
        role: "Artist",
        name: "Demo Artist",
        city: "Atlanta",
        radius: 50,
        genre: "R&B",
        budget: 250,
        gpsConsent: true,
        createdAt: new Date().toISOString()
      }
    ],
    gigs: [
      {
        id: crypto.randomUUID(),
        title: "Friday Night R&B Showcase",
        location: "Atlanta, GA",
        genre: "R&B",
        pay: 350,
        createdAt: new Date().toISOString()
      }
    ],
    alerts: []
  },
  distribution: {
    active: false,
    billing: "yearly",
    releases: [
      {
        id: crypto.randomUUID(),
        releaseTitle: "Moment of Light",
        artistName: "Demo Artist",
        isrc: "USIA02600001",
        upc: "",
        rightsBasis: "Copyright ownership",
        targetPlatforms: "Spotify, Apple Music, YouTube Music",
        audioFile: "moment-of-light.wav",
        artworkFile: "cover-art.png",
        proofFile: "",
        splitFile: "",
        distributionAuthority: true,
        scanConsent: true,
        status: "Proof Needed",
        scanStatus: "Waiting for rights proof",
        licenseId: "",
        createdAt: new Date().toISOString()
      }
    ]
  },
  bitcoin: {
    active: false,
    trees: [
      {
        id: crypto.randomUUID(),
        artistName: "Demo Artist",
        walletLabel: "Demo Artist treasury wallet",
        walletAddress: "bc1-demo-internal-record",
        packageType: "Fan vesting tree",
        supportGoal: 1000,
        vestingMonths: 12,
        fanRewardPercent: 10,
        dropAsset: "",
        campaignDescription: "Fans support the release campaign and receive access, badges, perks, or legally approved rewards.",
        riskConsent: true,
        legalReview: true,
        status: "Planning Only",
        projection: null,
        createdAt: new Date().toISOString()
      }
    ]
  },
  partner: {
    active: false,
    annualPrice: 4000,
    seatLimit: 50,
    business: {
      businessName: "Demo Partner Group",
      email: "partner@example.com",
      businessType: "Management company",
      lobbyName: "Demo Partner Lobby",
      termsAccepted: true,
      createdAt: new Date().toISOString()
    },
    artists: [],
    deals: [],
    market: {
      rootCoin: "AWOBE",
      subCoins: [],
      lastSnapshot: null
    }
  },
  contents: [
    {
      id: crypto.randomUUID(),
      title: "Moment of Light",
      isrc: "USIA02600001",
      upc: "",
      linkRequest: "none",
      linkFee: 0,
      sampleUse: "No samples used",
      sampleExplanation: "",
      proofReviewStatus: "Pending JVM Review",
      audioFingerprintStatus: "Pending",
      visualWatermarkStatus: "Pending",
      sampleReviewStatus: "Not Required",
      linkEligibility: "Proof Needed",
      releaseType: "Single",
      splitNote: "100% owned",
      platformLinks: "Spotify, Apple Music, YouTube",
      audioFile: "moment-of-light.wav",
      visualFile: "cover-art.png",
      proofFile: "",
      status: "Proof Needed",
      cover: covers[0],
      createdAt: new Date().toISOString()
    }
  ],
  requests: []
};

let state = loadState();
let runtimeOnline = false;

const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value || 0).toFixed(2)}`;

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialState);

  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(initialState),
      ...parsed,
      subscriber: { ...initialState.subscriber, ...(parsed.subscriber || {}) },
      basic: {
        ...initialState.basic,
        ...(parsed.basic || {}),
        exchanges: Array.isArray(parsed.basic?.exchanges) ? parsed.basic.exchanges : []
      },
      fans: {
        ...initialState.fans,
        ...(parsed.fans || {}),
        profiles: Array.isArray(parsed.fans?.profiles) ? parsed.fans.profiles : initialState.fans.profiles,
        tips: Array.isArray(parsed.fans?.tips) ? parsed.fans.tips : []
      },
      cloud: {
        ...initialState.cloud,
        ...(parsed.cloud || {}),
        leases: Array.isArray(parsed.cloud?.leases) ? parsed.cloud.leases : []
      },
      promotion: {
        ...initialState.promotion,
        ...(parsed.promotion || {}),
        profiles: Array.isArray(parsed.promotion?.profiles) ? parsed.promotion.profiles : initialState.promotion.profiles,
        gigs: Array.isArray(parsed.promotion?.gigs) ? parsed.promotion.gigs : initialState.promotion.gigs,
        alerts: Array.isArray(parsed.promotion?.alerts) ? parsed.promotion.alerts : []
      },
      distribution: {
        ...initialState.distribution,
        ...(parsed.distribution || {}),
        releases: Array.isArray(parsed.distribution?.releases) ? parsed.distribution.releases : initialState.distribution.releases
      },
      bitcoin: {
        ...initialState.bitcoin,
        ...(parsed.bitcoin || {}),
        trees: Array.isArray(parsed.bitcoin?.trees) ? parsed.bitcoin.trees : initialState.bitcoin.trees
      },
      partner: {
        ...initialState.partner,
        ...(parsed.partner || {}),
        business: { ...initialState.partner.business, ...(parsed.partner?.business || {}) },
        artists: Array.isArray(parsed.partner?.artists) ? parsed.partner.artists : [],
        deals: Array.isArray(parsed.partner?.deals) ? parsed.partner.deals : [],
        market: {
          ...initialState.partner.market,
          ...(parsed.partner?.market || {}),
          subCoins: Array.isArray(parsed.partner?.market?.subCoins) ? parsed.partner.market.subCoins : []
        }
      },
      contents: Array.isArray(parsed.contents) ? parsed.contents : initialState.contents,
      requests: Array.isArray(parsed.requests) ? parsed.requests : []
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function syncFromRuntime() {
  if (!RUNTIME_API) return;

  try {
    const response = await fetch(`${RUNTIME_API}/state`, { cache: "no-store" });
    if (!response.ok) throw new Error("Runtime state unavailable");
    state = await response.json();
    runtimeOnline = true;
    render();
  } catch {
    runtimeOnline = false;
  }
}

async function emitRuntimeEvent(type, payload = {}) {
  if (!RUNTIME_API) return false;

  try {
    const response = await fetch(`${RUNTIME_API}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload })
    });

    if (!response.ok) throw new Error("Runtime event rejected");
    const result = await response.json();
    state = result.state;
    runtimeOnline = true;
    render();
    return true;
  } catch {
    runtimeOnline = false;
    return false;
  }
}

function applyLocalEvent(type, payload = {}) {
  if (type === "subscriber.created") {
    state.subscriber = {
      artistName: payload.artistName,
      email: payload.email,
      username: payload.username,
      genre: payload.genre,
      goal: payload.goal,
      plan: payload.plan,
      trackingConsent: Boolean(payload.trackingConsent),
      ownershipAttestation: Boolean(payload.ownershipAttestation),
      termsAccepted: Boolean(payload.termsAccepted),
      passwordConfigured: Boolean(payload.passwordConfigured),
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      createdAt: new Date().toISOString()
    };
  }

  if (type === "content.submitted") {
    const proofFile = payload.proofFile || "";
    const content = {
      id: crypto.randomUUID(),
      title: payload.title,
      isrc: payload.isrc,
      upc: payload.upc,
      linkRequest: payload.linkRequest || "none",
      linkFee: linkFee(payload.linkRequest),
      sampleUse: payload.sampleUse || "No samples used",
      sampleExplanation: payload.sampleExplanation || "",
      proofReviewStatus: proofFile ? "JVM Review Ready" : "Proof Needed",
      audioFingerprintStatus: "Pending",
      visualWatermarkStatus: payload.visualFile ? "Pending" : "Not Required",
      sampleReviewStatus: sampleReviewStatus(payload.sampleUse),
      linkEligibility: linkEligibility({
        proofFile,
        linkRequest: payload.linkRequest,
        sampleUse: payload.sampleUse,
        sampleExplanation: payload.sampleExplanation
      }),
      releaseType: payload.releaseType,
      splitNote: payload.splitNote,
      platformLinks: payload.platformLinks,
      audioFile: payload.audioFile,
      visualFile: payload.visualFile,
      proofFile,
      documentFile: payload.documentFile,
      jpegFile: payload.jpegFile,
      videoFile: payload.videoFile,
      status: proofFile ? "Ready" : "Proof Needed",
      cover: covers[state.contents.length % covers.length],
      createdAt: new Date().toISOString()
    };
    state.contents.push(content);

    if (state.subscriber.plan === "protection") {
      applyLocalEvent("tracking.requested", {
        contentId: content.id,
        type: "Index search and fingerprint review"
      });
    }
  }

  if (type === "basic.permissions.updated") {
    state.basic = {
      ...state.basic,
      accountModel: payload.accountModel,
      artistSubscriptionPrice: Number(payload.artistSubscriptionPrice),
      stationName: payload.stationName,
      audience: payload.audience,
      acceptPlatformSubscribers: Boolean(payload.acceptPlatformSubscribers),
      captchaEnabled: Boolean(payload.captchaEnabled),
      minorSafeTerms: Boolean(payload.minorSafeTerms),
      adultTerms: Boolean(payload.adultTerms),
      monetizationEnabled: true,
      sellMusicEnabled: true,
      liveVideoEnabled: true,
      liveAudioRadioEnabled: true,
      canUseIndexScanning: false
    };
  }

  if (type === "basic.subscription.exchange.requested") {
    state.basic.exchanges.push({
      id: crypto.randomUUID(),
      fromArtist: payload.fromArtist,
      toArtist: payload.toArtist,
      status: "Pending 7-Day Review",
      requestedAt: new Date().toISOString(),
      eligibleAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  if (type === "fan.profile.created") {
    state.fans.profiles.push({
      id: crypto.randomUUID(),
      displayName: payload.displayName,
      email: payload.email,
      username: payload.username,
      profilePicture: payload.profilePicture,
      experience: payload.experience,
      visibility: payload.visibility,
      genres: Array.isArray(payload.genres) ? payload.genres : [],
      expectationNote: payload.expectationNote,
      searchConsent: Boolean(payload.searchConsent),
      termsAccepted: Boolean(payload.termsAccepted),
      passwordConfigured: Boolean(payload.passwordConfigured),
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      createdAt: new Date().toISOString()
    });
  }

  if (type === "fan.tip.recorded") {
    const tipValue = Number(payload.tipValue || 0);
    const artistValueBoost = Number(payload.coinValue || payload.artistValueBoost || tipValue);
    const supportPath = payload.supportPath || "tip";
    const cashOutRate = Number(payload.cashOutRate ?? 15);
    const platformFeeValue = supportPath === "tip" ? tipValue * (cashOutRate / 100) : 0;
    const payoutValue = supportPath === "tip" ? Math.max(0, tipValue - platformFeeValue) : 0;
    state.fans.tips.push({
      id: crypto.randomUUID(),
      artistName: payload.artistName,
      tipValue,
      coinValue: 0,
      artistValueBoost,
      supportPath,
      cashOutRate,
      platformFeeValue,
      tradeRequired: false,
      payoutValue,
      netValue: payoutValue,
      status: supportPath === "tip" ? "Tip Cash-Out Available" : "Investment/Perks Pending",
      createdAt: new Date().toISOString()
    });
  }

  if (type === "cloud.space.purchased") {
    state.cloud.leases.push({
      id: crypto.randomUUID(),
      username: payload.username,
      email: payload.email,
      artistName: payload.artistName,
      spacePackage: payload.spacePackage,
      termsAccepted: Boolean(payload.termsAccepted),
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      status: "Cloud Lease Planning",
      createdAt: new Date().toISOString()
    });
  }

  if (type === "tracking.requested") {
    const firstContent = state.contents[0];
    state.requests.push({
      id: crypto.randomUUID(),
      contentId: payload.contentId || firstContent?.id || null,
      type: payload.type,
      status: "Open",
      createdAt: new Date().toISOString()
    });
  }

  if (type === "promotion.profile.created") {
    state.promotion.active = true;
    state.promotion.profiles.push({
      id: crypto.randomUUID(),
      role: payload.role,
      name: payload.name,
      email: payload.email,
      username: payload.username,
      city: payload.city,
      radius: Number(payload.radius),
      genre: payload.genre,
      budget: Number(payload.budget),
      gpsConsent: Boolean(payload.gpsConsent),
      termsAccepted: Boolean(payload.termsAccepted),
      passwordConfigured: Boolean(payload.passwordConfigured),
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      createdAt: new Date().toISOString()
    });
  }

  if (type === "promotion.gig.created") {
    state.promotion.gigs.push({
      id: crypto.randomUUID(),
      title: payload.title,
      location: payload.location,
      genre: payload.genre,
      pay: Number(payload.pay),
      createdAt: new Date().toISOString()
    });
  }

  if (type === "promotion.match.run") {
    const matches = buildPromotionMatches();
    state.promotion.alerts = matches.map((match) => ({
      id: crypto.randomUUID(),
      title: match.title,
      message: match.reason,
      createdAt: new Date().toISOString()
    }));
  }

  if (type === "distribution.release.submitted") {
    const proofFile = payload.proofFile || "";
    const release = {
      id: crypto.randomUUID(),
      releaseTitle: payload.releaseTitle,
      artistName: payload.artistName,
      isrc: payload.isrc,
      upc: payload.upc,
      rightsBasis: payload.rightsBasis,
      targetPlatforms: payload.targetPlatforms,
      audioFile: payload.audioFile,
      artworkFile: payload.artworkFile,
      proofFile,
      splitFile: payload.splitFile,
      videoFile: payload.videoFile,
      distributionAuthority: Boolean(payload.distributionAuthority),
      scanConsent: Boolean(payload.scanConsent),
      status: proofFile ? "Review Ready" : "Proof Needed",
      scanStatus: proofFile ? "Ready for ISRC and fingerprint scan" : "Waiting for rights proof",
      licenseId: "",
      createdAt: new Date().toISOString()
    };
    state.distribution.active = true;
    state.distribution.billing = payload.billing === "monthly" ? "monthly" : "yearly";
    state.distribution.releases.push(release);
  }

  if (type === "distribution.review.run") {
    state.distribution.releases = state.distribution.releases.map((release) => {
      const proofReady = Boolean(release.proofFile);
      const consentReady = release.distributionAuthority && release.scanConsent;
      const isrcReady = Boolean(release.isrc);
      const canLicense = proofReady && consentReady && isrcReady;

      return {
        ...release,
        status: canLicense ? "License Generated" : "Needs Review",
        scanStatus: canLicense ? "ISRC scan and fingerprint review cleared for internal prototype" : "Missing proof, authority, scan consent, or ISRC",
        licenseId: canLicense ? release.licenseId || `IA-DIST-${release.isrc}-${Date.now()}` : ""
      };
    });
  }

  if (type === "bitcoin.tree.created") {
    state.bitcoin.active = true;
    state.bitcoin.trees.push({
      id: crypto.randomUUID(),
      artistName: payload.artistName,
      walletLabel: payload.walletLabel,
      walletAddress: payload.walletAddress || "internal-wallet-record",
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      rootCoin: "AWOBE",
      rootCoinPurchaseValue: Number(payload.rootCoinPurchaseValue || 0),
      chainBlockSource: payload.chainBlockSource,
      branchCoinSymbol: payload.branchCoinSymbol,
      branchCoinSupply: Number(payload.branchCoinSupply || 1),
      baseValueMultiplier: Number(payload.baseValueMultiplier || 1),
      branchBaseValue: Number(payload.rootCoinPurchaseValue || 0) * Number(payload.baseValueMultiplier || 1),
      settlementRule: "JVM_HALF_SUM_AFTER_PAYOUT",
      packageType: payload.packageType,
      supportGoal: Number(payload.supportGoal),
      vestingMonths: Number(payload.vestingMonths),
      fanRewardPercent: Number(payload.fanRewardPercent),
      dropAsset: payload.dropAsset,
      campaignDescription: payload.campaignDescription,
      riskConsent: Boolean(payload.riskConsent),
      legalReview: Boolean(payload.legalReview),
      status: "Planning Only",
      projection: null,
      createdAt: new Date().toISOString()
    });
  }

  if (type === "bitcoin.projection.run") {
    state.bitcoin.trees = state.bitcoin.trees.map((tree) => {
      const goal = Number(tree.supportGoal || 0);
      const rewardPool = goal * (Number(tree.fanRewardPercent || 0) / 100);
      const monthlyUnlock = rewardPool / Math.max(1, Number(tree.vestingMonths || 1));
      const branchBaseValue = Number(tree.rootCoinPurchaseValue || 0) * Number(tree.baseValueMultiplier || 1);
      const impliedBranchMarketValue = branchBaseValue * Number(tree.branchCoinSupply || 0);
      const settlement = calculateJvmSettlement({
        artistRouteCoinValue: impliedBranchMarketValue,
        fanBaseCoinValue: impliedBranchMarketValue
      });

      return {
        ...tree,
        branchBaseValue,
        projection: {
          rewardPool,
          monthlyUnlock,
          supportersNeededAt25: Math.ceil(goal / 25),
          supportersNeededAt50: Math.ceil(goal / 50),
          branchBaseValue,
          impliedBranchMarketValue,
          settlement
        },
        status: tree.riskConsent && tree.legalReview ? "Internal Projection Ready" : "Compliance Review Needed"
      };
    });
  }

  if (type === "partner.created") {
    state.partner.active = true;
    state.partner.annualPrice = Number(payload.annualPackage || 4000);
    state.partner.seatLimit = Math.min(50, Number(payload.seatLimit || 50));
    state.partner.business = {
      businessName: payload.businessName,
      email: payload.email,
      username: payload.username,
      businessType: payload.businessType,
      lobbyName: payload.lobbyName,
      termsAccepted: Boolean(payload.termsAccepted),
      passwordConfigured: Boolean(payload.passwordConfigured),
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      createdAt: new Date().toISOString()
    };
  }

  if (type === "partner.artist.registered") {
    if (state.partner.artists.length >= state.partner.seatLimit) return;
    const artist = {
      id: crypto.randomUUID(),
      artistName: payload.artistName,
      artistEmail: payload.artistEmail,
      username: payload.username,
      contractType: payload.contractType,
      accessPackage: payload.accessPackage,
      termsAccepted: Boolean(payload.termsAccepted),
      passwordConfigured: Boolean(payload.passwordConfigured),
      walletPasswordConfigured: Boolean(payload.walletPasswordConfigured),
      status: "Registered",
      createdAt: new Date().toISOString()
    };
    state.partner.active = true;
    state.partner.artists.push(artist);
    state.partner.market.subCoins.push({
      id: crypto.randomUUID(),
      symbol: `${artist.artistName.replaceAll(" ", "").slice(0, 6).toUpperCase()}-SUB`,
      artistName: artist.artistName,
      source: "Awobe Inc. Coin Tree",
      status: "Internal only"
    });
  }

  if (type === "partner.deal.created") {
    state.partner.deals.push({
      id: crypto.randomUUID(),
      title: payload.title,
      artistName: payload.artistName,
      dealValue: Number(payload.dealValue),
      status: "Admin Review",
      createdAt: new Date().toISOString()
    });
  }

  if (type === "partner.market.snapshot") {
    const artistCount = state.partner.artists.length;
    const dealValue = state.partner.deals.reduce((total, deal) => total + Number(deal.dealValue || 0), 0);
    state.partner.market.lastSnapshot = {
      rootCoin: "AWOBE",
      subCoinCount: state.partner.market.subCoins.length,
      artistSeatUse: `${artistCount}/${state.partner.seatLimit}`,
      internalDealValue: dealValue,
      status: "Internal market simulation only",
      createdAt: new Date().toISOString()
    };
  }

  if (type === "runtime.reset") {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(initialState);
  }
}

async function runEvent(type, payload = {}) {
  const handledByRuntime = await emitRuntimeEvent(type, payload);
  if (!handledByRuntime) {
    applyLocalEvent(type, payload);
    render();
  }
}

function linkFee(linkRequest) {
  if (linkRequest === "isrc") return 1.5;
  if (linkRequest === "upc") return 1;
  if (linkRequest === "both") return 2.5;
  return 0;
}

function sampleReviewStatus(sampleUse) {
  if (!sampleUse || sampleUse === "No samples used") return "Not Required";
  if (sampleUse === "Licensed sample") return "License Review";
  if (sampleUse === "Public use / public domain claim") return "Public Use Review";
  return "Admin Escalation";
}

function linkEligibility({ proofFile, linkRequest, sampleUse, sampleExplanation }) {
  if (!linkRequest || linkRequest === "none") return "No Paid Link Requested";
  if (!proofFile) return "Blocked: Proof Required";
  if (sampleUse && sampleUse !== "No samples used" && !sampleExplanation) return "Escalated: Sample Explanation Needed";
  if (sampleUse === "Unclear sample needs review") return "Escalated: Admin Sample Review";
  return "Eligible After JVM Scan";
}

function render() {
  renderPlan();
  renderBasic();
  renderFans();
  renderCloud();
  renderResolver();
  renderIndex();
  renderRequests();
  renderLaunch();
  renderDistribution();
  renderPromotion();
  renderBitcoin();
  renderPartner();
  renderSubscriberSummary();
  saveState();
}

function renderPlan() {
  const plan = plans[state.subscriber.plan] || plans.platform;
  $("#selected-plan-name").textContent = plan.name;
  $("#selected-plan-price").textContent = money(plan.price).replace(".00", "");

  document.querySelectorAll('[name="plan"]').forEach((input) => {
    input.checked = input.value === state.subscriber.plan;
  });
}

function renderResolver() {
  const gaps = getSetupGaps();
  const plan = plans[state.subscriber.plan] || plans.platform;

  $("#resolver-card").innerHTML = `
    <div class="metric-list">
      <div><span>Plan</span><strong>${escapeHtml(plan.name)}</strong></div>
      <div><span>Annual access</span><strong>${money(plan.price)}</strong></div>
      <div><span>Content submitted</span><strong>${state.contents.length}</strong></div>
      <div><span>Open setup items</span><strong>${gaps.length}</strong></div>
      <div><span>Runtime</span><strong>${runtimeOnline ? "Server" : "Local"}</strong></div>
    </div>
    <p class="helper-copy">${gaps[0] || "Your account is ready for launch support, campaign planning, and fan subscription setup."}</p>
  `;
}

function renderIndex() {
  const query = $("#search").value.trim().toLowerCase();
  const contents = state.contents.filter((item) => {
    const haystack = `${item.title} ${item.isrc} ${item.upc} ${item.releaseType} ${item.status}`.toLowerCase();
    return haystack.includes(query);
  });

  $("#track-count").textContent = `${contents.length} item${contents.length === 1 ? "" : "s"}`;
  $("#track-list").innerHTML = contents.map((item) => `
    <article class="track-row" data-ai-record="content" data-content-id="${item.id}">
      <div class="cover" style="--cover: ${item.cover}"></div>
      <div class="track-meta">
        <strong>${escapeHtml(item.title)}</strong>
        <span>ISRC: ${escapeHtml(item.isrc || "Existing not provided")} - UPC: ${escapeHtml(item.upc || "Optional")} - Link fee: ${money(item.linkFee || 0)}</span>
        <small>${escapeHtml(item.linkEligibility || "Proof Needed")} - ${escapeHtml(item.audioFingerprintStatus || "Pending")} audio - ${escapeHtml(item.visualWatermarkStatus || "Pending")} visual - ${escapeHtml(item.sampleReviewStatus || "Not Required")}</small>
      </div>
      <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
    </article>
  `).join("") || `<p class="empty-state">No matching content yet.</p>`;
}

function renderRequests() {
  const rows = state.requests.slice().reverse().map((request) => {
    const item = state.contents.find((content) => content.id === request.contentId);
    return `
      <tr>
        <td>${new Date(request.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
        <td>${escapeHtml(item?.title || "General account")}</td>
        <td>${escapeHtml(request.type)}</td>
        <td><span class="status pending">${escapeHtml(request.status)}</span></td>
        <td>${escapeHtml(item?.proofFile || "Proof requested")}</td>
      </tr>
    `;
  });

  $("#ledger-body").innerHTML = rows.join("") || `
    <tr>
      <td colspan="5">No tracking requests yet. Add content, then log an index search or enforcement request.</td>
    </tr>
  `;
}

function renderLaunch() {
  const gaps = getSetupGaps();
  const totalChecks = 6;
  const score = Math.max(0, Math.round(((totalChecks - gaps.length) / totalChecks) * 100));
  $("#launch-score").textContent = `${score}%`;
  $("#launch-gaps").innerHTML = gaps.map((gap) => `<div>${escapeHtml(gap)}</div>`).join("") || "<div>Ready for campaign planning and fan subscription setup.</div>";
}

function renderSubscriberSummary() {
  const subscriber = state.subscriber;
  const plan = plans[subscriber.plan] || plans.platform;

  $("#subscriber-summary").innerHTML = `
    <div><span>Artist</span><strong>${escapeHtml(subscriber.artistName)}</strong></div>
    <div><span>Email</span><strong>${escapeHtml(subscriber.email)}</strong></div>
    <div><span>Plan</span><strong>${escapeHtml(plan.name)}</strong></div>
    <div><span>Goal</span><strong>${escapeHtml(subscriber.goal)}</strong></div>
  `;
}

function getSetupGaps() {
  const gaps = [];
  const subscriber = state.subscriber;
  const hasContent = state.contents.length > 0;
  const hasProof = state.contents.some((item) => item.proofFile);
  const hasIsrc = state.contents.some((item) => item.isrc);
  const hasLinks = state.contents.some((item) => item.platformLinks);

  if (!subscriber.artistName || subscriber.artistName === "Demo Artist") gaps.push("Create a real subscriber profile.");
  if (!subscriber.trackingConsent) gaps.push("Approve off-platform royalty and license tracking requests.");
  if (!subscriber.ownershipAttestation) gaps.push("Confirm ownership, license, or lease rights.");
  if (!hasContent) gaps.push("Upload at least one song or release.");
  if (!hasIsrc) gaps.push("Add an existing ISRC or request platform ISRC linking for $1.50.");
  if (!hasProof) gaps.push("Upload copyright, license, lease, or ownership proof.");
  if (!hasLinks) gaps.push("Add external platform links for royalty tracking.");
  if (subscriber.plan !== "protection") gaps.push("Upgrade to Index Protection for fingerprint enforcement and index searches.");
  if (!state.promotion.active) gaps.push("Activate Promotion Network for paid local performance matching.");
  if (!state.distribution.active) gaps.push("Activate Distribution Desk before transferring music to external streaming platforms.");
  if (!state.bitcoin.active) gaps.push("Create a Bitcoin Tree package before planning NFT or coin-based fan support.");
  if (!state.partner.active) gaps.push("Create a Business Partner platform for managed artist rosters and deal lobbies.");

  return gaps.slice(0, 6);
}

function addRequest(type) {
  return runEvent("tracking.requested", {
    contentId: state.contents[0]?.id || null,
    type
  });
}

function supportAnswer(issue) {
  const lower = issue.toLowerCase();

  if (lower.includes("upc")) {
    return "You can start with an ISRC. UPC is useful for release-level products, but it should stay optional at signup. Add UPC later when the release or distributor provides it.";
  }

  if (lower.includes("isrc")) {
    return "Existing ISRCs can be entered freely. Platform ISRC linking costs $1.50 and must wait for proof verification, audio fingerprint scan, visual watermark scan when needed, and sample review if the scan detects or the artist reports samples.";
  }

  if (lower.includes("proof") || lower.includes("copyright") || lower.includes("lease") || lower.includes("license")) {
    return "Before ISRC/UPC platform linking, request proof of ownership, copyright, license, lease, or split documentation. JVM can verify basic proof; unclear cases escalate to admin.";
  }

  if (lower.includes("sample") || lower.includes("public use")) {
    return "Samples do not automatically disqualify ISRC linking. If a sample is detected, apply public use/public domain/license review. Distribution licensing needs a more detailed explanation and targeted approval search.";
  }

  if (lower.includes("marketing") || lower.includes("campaign")) {
    return "Start with the artist goal, one target audience, one content theme, and a 14-day calendar. The launch dashboard can turn that into posts, artwork direction, and fan subscription offers.";
  }

  if (lower.includes("distribution") || lower.includes("distribute")) {
    return "Distribution is separate from the site subscription. Require an ISRC, proof of copyright/license/lease, distribution authority, and scan consent before generating a distribution license or preparing transfer to streaming platforms.";
  }

  if (lower.includes("fingerprint") || lower.includes("infringement") || lower.includes("soundscan") || lower.includes("mdx")) {
    return "For now this prototype marks scan readiness internally. Later, the scan layer can connect to services like SoundScan-style reporting, MDX-style matching, or an in-house fingerprint/copyright search engine.";
  }

  if (lower.includes("bitcoin") || lower.includes("nft") || lower.includes("vesting") || lower.includes("coin")) {
    return "The Bitcoin Tree should stay in planning mode until reviewed. Artists can record a wallet, NFT/drop plan, fan support tree, and vesting projection, but real income promises, tokens, or rewards need legal, tax, and compliance review first.";
  }

  if (lower.includes("fan") || lower.includes("spectator") || lower.includes("tip") || lower.includes("comment") || lower.includes("message")) {
    return "Fan/spectator profiles should start free. Ask what kind of entertainment they want, collect genre and experience preferences, then let JVM route them to public artist pages with messages, comments, live interaction, profile-picture identity, and tip intent tracking. Spectators should not host streams or upload music.";
  }

  if (lower.includes("business") || lower.includes("partner") || lower.includes("merchant") || lower.includes("lobby")) {
    return "Use the Business Partner model before individual merchant accounts. A verified business can pay $4,000/year, manage up to 50 contracted artists, open a lobby, create deal proposals, and request admin review before contracts or internal coin activity move forward.";
  }

  if (lower.includes("basic") || lower.includes("subscriber") || lower.includes("subscription")) {
    return "Basic artists are creator customer/partners. They can sell music, receive monetization, stream live video/audio radio, and subscribe to 50 included artist pages. Index scanning requires an upgrade, and artist-subscription exchanges take up to 7 days.";
  }

  return "Use the setup resolver first: check plan, tracking consent, ownership proof, ISRC, platform links, and launch score. Then route the artist to either rights review, royalty tracking, marketing, or fan subscription setup.";
}

function renderBasic() {
  const basic = state.basic;
  const remaining = Math.max(0, Number(basic.includedArtistSubscriptions) - Number(basic.usedArtistSubscriptions || 0));

  $("#basic-summary").innerHTML = `
    <article class="match-card" data-ai-record="basic-permissions">
      <div>
        <strong>${escapeHtml(basic.accountModel)}</strong>
        <span>${escapeHtml(basic.stationName)} - ${money(basic.artistSubscriptionPrice)} artist subscription price</span>
      </div>
      <small>${remaining}/${basic.includedArtistSubscriptions} included artist subscriptions available. Index scanning: ${basic.canUseIndexScanning ? "Enabled" : "Upgrade required"}.</small>
    </article>
    ${basic.exchanges.map((exchange) => `
      <article class="match-card" data-ai-record="subscription-exchange">
        <div>
          <strong>${escapeHtml(exchange.fromArtist)} to ${escapeHtml(exchange.toArtist)}</strong>
          <span>${escapeHtml(exchange.status)}</span>
        </div>
        <small>Eligible after ${new Date(exchange.eligibleAfter).toLocaleDateString()} to prevent rapid subscription switching.</small>
      </article>
    `).join("")}
  `;
}

function renderFans() {
  const profiles = state.fans?.profiles || [];
  const tips = state.fans?.tips || [];
  const matches = buildFanMatches();

  $("#fan-match-list").innerHTML = matches.map((match) => `
    <article class="match-card" data-ai-record="fan-artist-match">
      <div>
        <strong>${escapeHtml(match.fanName)} to ${escapeHtml(match.artistName)}</strong>
        <span>${escapeHtml(match.route)}</span>
      </div>
      <small>${escapeHtml(match.reason)}${match.profilePicture ? ` Profile picture: ${escapeHtml(match.profilePicture)}.` : ""}</small>
    </article>
  `).join("") || `<p class="empty-state">Create a fan profile and an artist profile to generate JVM matches.</p>`;

  $("#fan-tip-ledger").innerHTML = tips.slice().reverse().map((tip) => `
    <article class="match-card" data-ai-record="fan-tip">
      <div>
        <strong>${escapeHtml(tip.artistName)}</strong>
        <span>${escapeHtml(tip.supportPath === "investment" ? "Investment/perks" : "Free tip")} value: ${money(tip.tipValue)} - Artist value boost: ${money(tip.artistValueBoost ?? tip.tipValue)}</span>
      </div>
      <small>${escapeHtml(tip.status)}. Platform fee: ${Number(tip.cashOutRate ?? 15)}% (${money(tip.platformFeeValue || 0)}). Artist keeps: ${money(tip.payoutValue)}. Investment/perk benefits are determined by platform management.</small>
    </article>
  `).join("") || `<p class="empty-state">No fan tip intents recorded yet.</p>`;
}

function renderCloud() {
  const leases = state.cloud?.leases || [];

  $("#cloud-lease-list").innerHTML = leases.slice().reverse().map((lease) => `
    <article class="match-card" data-ai-record="cloud-lease">
      <div>
        <strong>${escapeHtml(lease.artistName)}</strong>
        <span>${escapeHtml(lease.spacePackage)} - ${escapeHtml(lease.username)}</span>
      </div>
      <small>${escapeHtml(lease.status)}. Wallet password configured: ${lease.walletPasswordConfigured ? "yes" : "no"}. Cloud storage, billing, CDN, and live replay infrastructure still need production services.</small>
    </article>
  `).join("") || `<p class="empty-state">No cloud space leases recorded yet.</p>`;
}

function buildFanMatches() {
  const profiles = state.fans?.profiles || [];
  const artists = [
    {
      artistName: state.subscriber.artistName,
      genre: state.subscriber.genre,
      route: state.basic.liveVideoEnabled ? "Live stream and artist page" : "Artist page"
    },
    ...state.promotion.profiles
      .filter((profile) => profile.role === "Artist")
      .map((profile) => ({
        artistName: profile.name,
        genre: profile.genre,
        route: "Promotion profile and paid performance alerts"
      })),
    ...state.partner.artists.map((artist) => ({
      artistName: artist.artistName,
      genre: artist.accessPackage,
      route: "Partner roster artist page"
    }))
  ].filter((artist) => artist.artistName);

  const matches = [];

  profiles.forEach((profile) => {
    artists.forEach((artist) => {
      const genres = Array.isArray(profile.genres) ? profile.genres : [];
      const artistGenre = String(artist.genre || "").toLowerCase();
      const genreFit = genres.some((genre) => artistGenre.includes(String(genre).toLowerCase()) || String(genre).toLowerCase().includes(artistGenre));
      const experience = String(profile.experience || "").toLowerCase();
      const liveFit = experience.includes("live") && artist.route.toLowerCase().includes("live");
      const discoverFit = experience.includes("discover") || experience.includes("listen");

      if (genreFit || liveFit || discoverFit) {
        matches.push({
          fanName: profile.displayName,
          profilePicture: profile.profilePicture,
          artistName: artist.artistName,
          route: artist.route,
          reason: `${profile.visibility} matched by ${[genreFit && "genre interest", liveFit && "live expectation", discoverFit && "discovery/listening intent"].filter(Boolean).join(", ")}. JVM can personalize search, comments, messages, and stream recommendations.`
        });
      }
    });
  });

  return matches.slice(0, 12);
}

function renderPartner() {
  const partner = state.partner;
  const artists = partner.artists || [];
  const deals = partner.deals || [];
  const seatsLeft = Math.max(0, Number(partner.seatLimit || 50) - artists.length);

  $("#partner-roster").innerHTML = `
    <article class="match-card" data-ai-record="business-partner">
      <div>
        <strong>${escapeHtml(partner.business.businessName)}</strong>
        <span>${escapeHtml(partner.business.businessType)} - ${escapeHtml(partner.business.lobbyName)} - ${artists.length}/${partner.seatLimit} seats used</span>
      </div>
      <small>$${Number(partner.annualPrice).toLocaleString()} yearly package. ${seatsLeft} artist seats available. Bitcoin Tree services billed separately.</small>
    </article>
    ${artists.map((artist) => `
      <article class="match-card" data-ai-record="partner-artist">
        <div>
          <strong>${escapeHtml(artist.artistName)}</strong>
          <span>${escapeHtml(artist.contractType)} - ${escapeHtml(artist.accessPackage)}</span>
        </div>
        <small>${escapeHtml(artist.status)} - ${escapeHtml(artist.artistEmail)}</small>
      </article>
    `).join("")}
    ${deals.map((deal) => `
      <article class="match-card" data-ai-record="partner-deal">
        <div>
          <strong>${escapeHtml(deal.title)}</strong>
          <span>${escapeHtml(deal.artistName)} - ${money(deal.dealValue)}</span>
        </div>
        <small>${escapeHtml(deal.status)} before artist acceptance or contract activation.</small>
      </article>
    `).join("")}
  `;

  const snapshot = partner.market.lastSnapshot;
  $("#partner-market").innerHTML = snapshot ? `
    <strong>${escapeHtml(snapshot.rootCoin)} internal market snapshot</strong>
    <span>Artist seats: ${escapeHtml(snapshot.artistSeatUse)}. Sub-coins: ${snapshot.subCoinCount}. Deal value: ${money(snapshot.internalDealValue)}.</span>
    <small>${escapeHtml(snapshot.status)}. No real trading, custody, or public exchange activity.</small>
  ` : `
    <span>Awobe Inc. Coin is the simulated root coin. Artist sub-coins are generated internally when artists are added to a partner roster.</span>
    <small>Run a market snapshot after registering artists or creating deal proposals.</small>
  `;
}

function toolOutput(tool) {
  const artist = state.subscriber.artistName || "the artist";
  const content = state.contents[0]?.title || "the first release";

  const outputs = {
    marketing: `Campaign plan for ${escapeHtml(artist)}: introduce the story behind ${escapeHtml(content)}, post proof-of-work studio clips, publish platform links, ask fans to follow the Index page, then invite supporters into the first subscription offer.`,
    artwork: `Artwork direction: create one bold cover image, one vertical motion visual, and three quote-style story graphics. Match the visuals to the song mood, not just the genre.`,
    fan: `Fan subscription starter: $3 supporter tier for early listens, $7 insider tier for unreleased demos and livestreams, and a founder badge for the first 50 fans.`,
    rights: `Rights checklist: confirm ISRC, request UPC only if release-level data is available, collect proof of ownership/license/lease, verify splits, then open tracking requests for external platforms.`,
    production: `Production workspace: keep audio versions, artwork, lyric sheets, metadata, collaborator notes, and approval status in one release room before launch.`,
    distribution: `Distribution desk: keep this separate from the site subscription. Require copyright, license, or lease proof; run ISRC and fingerprint review; generate a distribution license; then prepare transfer to streaming platforms.`,
    live: `Collaboration live format: host subscriber-only listening rooms, artist think tanks, live co-writing sessions, performance streams, and paid Q&A rooms with chat moderation.`,
    money: `Money tools: enable one-time tips, paid live sessions, funding goals, fan subscriptions, replay access, Bitcoin Tree planning, and a clear payout ledger showing gross, fees, net, pending, and paid.`
  };

  return outputs[tool] || "Choose a tool to generate launch guidance.";
}

function calculateJvmSettlement({
  artistRouteCoinValue = 0,
  fanBaseCoinValue = 0,
  payoutRatio = 0.5
} = {}) {
  const artistValue = Number(artistRouteCoinValue || 0);
  const fanValue = Number(fanBaseCoinValue || 0);
  const blockchainValueBeforePayout = artistValue + fanValue;
  const blockchainValueAfterPayout = blockchainValueBeforePayout * Number(payoutRatio || 0);
  const artistPayoutValue = Math.min(fanValue, blockchainValueBeforePayout - blockchainValueAfterPayout);

  return {
    artistRouteCoinValue: artistValue,
    fanBaseCoinValue: fanValue,
    blockchainValueBeforePayout,
    blockchainValueAfterPayout,
    artistPayoutValue,
    retainedArtistMarketValue: artistValue,
    payoutRatio
  };
}

function renderBitcoin() {
  const trees = state.bitcoin?.trees || [];
  const projectedTree = trees.find((tree) => tree.projection);

  $("#bitcoin-tree-list").innerHTML = trees.map((tree) => `
    <article class="match-card" data-ai-record="bitcoin-tree">
      <div>
        <strong>${escapeHtml(tree.artistName)} - ${escapeHtml(tree.packageType)}</strong>
        <span>${escapeHtml(tree.branchCoinSymbol || "ARTIST-SUB")} rooted to ${escapeHtml(tree.rootCoin || "AWOBE")} - Base: ${money(tree.branchBaseValue || 0)} - Supply: ${Number(tree.branchCoinSupply || 0).toLocaleString()}</span>
      </div>
      <small>${escapeHtml(tree.status)} - Source: ${escapeHtml(tree.chainBlockSource || "Root source pending")} - Goal: ${money(tree.supportGoal)} - ${escapeHtml(tree.campaignDescription)}</small>
    </article>
  `).join("") || `<p class="empty-state">No Bitcoin Tree packages created yet.</p>`;

  $("#bitcoin-projection").innerHTML = projectedTree?.projection ? `
    <strong>${escapeHtml(projectedTree.artistName)} projection</strong>
    <span>${escapeHtml(projectedTree.branchCoinSymbol || "ARTIST-SUB")} base value: ${money(projectedTree.projection.branchBaseValue)} from root purchase ${money(projectedTree.rootCoinPurchaseValue)}.</span>
    <small>Trade sum before payout: ${money(projectedTree.projection.settlement.blockchainValueBeforePayout)}. Blockchain value after payout: ${money(projectedTree.projection.settlement.blockchainValueAfterPayout)}. Artist payout value: ${money(projectedTree.projection.settlement.artistPayoutValue)}. Simulation only.</small>
  ` : `
    <span>No projection generated yet.</span>
    <small>Create a Bitcoin Tree, then run projection. This does not create real Bitcoin, NFT, token, or income rights.</small>
  `;
}

function renderDistribution() {
  const releases = state.distribution?.releases || [];
  const plan = distributionPlans[state.distribution?.billing || "yearly"];
  const licensedRelease = releases.find((release) => release.licenseId);

  $("#distribution-list").innerHTML = releases.map((release) => `
    <article class="match-card" data-ai-record="distribution-release">
      <div>
        <strong>${escapeHtml(release.releaseTitle)}</strong>
        <span>${escapeHtml(release.artistName)} - ISRC: ${escapeHtml(release.isrc || "Required")} - ${escapeHtml(release.rightsBasis)}</span>
      </div>
      <small>${escapeHtml(release.status)} - ${escapeHtml(release.scanStatus)} - ${escapeHtml(release.targetPlatforms)}</small>
    </article>
  `).join("") || `<p class="empty-state">No releases submitted for distribution review yet.</p>`;

  $("#distribution-license").innerHTML = licensedRelease ? `
    <strong>${escapeHtml(licensedRelease.licenseId)}</strong>
    <span>Index Audio has an internal distribution authority record for ${escapeHtml(licensedRelease.releaseTitle)} by ${escapeHtml(licensedRelease.artistName)}.</span>
    <small>Plan: ${escapeHtml(plan.name)} at ${money(plan.price)}/${plan.period}. Transfer remains blocked until real platform connections are established.</small>
  ` : `
    <span>No distribution license generated yet.</span>
    <small>Upload rights proof, authorize distribution, authorize scan review, then run the rights scan.</small>
  `;
}

function renderPromotion() {
  const profiles = state.promotion.profiles || [];
  const gigs = state.promotion.gigs || [];
  const matches = buildPromotionMatches();

  $("#promotion-matches").innerHTML = matches.map((match) => `
    <article class="match-card" data-ai-record="performance-match">
      <div>
        <strong>${escapeHtml(match.title)}</strong>
        <span>${escapeHtml(match.location)} - ${escapeHtml(match.genre)} - ${money(match.pay)}</span>
      </div>
      <small>${escapeHtml(match.reason)}</small>
    </article>
  `).join("") || `
    <p class="empty-state">Create a promotion profile and post a gig to see local paid performance matches.</p>
  `;

  $("#run-promotion-match").textContent = `Run Match (${profiles.length} profiles / ${gigs.length} gigs)`;
}

function buildPromotionMatches() {
  const profiles = state.promotion.profiles || [];
  const gigs = state.promotion.gigs || [];
  const matches = [];

  profiles.forEach((profile) => {
    gigs.forEach((gig) => {
      const genreFit = gig.genre.toLowerCase().includes(profile.genre.toLowerCase()) || profile.genre.toLowerCase().includes(gig.genre.toLowerCase());
      const cityFit = gig.location.toLowerCase().includes(profile.city.toLowerCase());
      const payFit = Number(gig.pay) >= Number(profile.budget || 0);

      if (genreFit || cityFit || payFit) {
        matches.push({
          ...gig,
          reason: `${profile.role} ${profile.name} matched by ${[genreFit && "genre", cityFit && "location", payFit && "pay"].filter(Boolean).join(", ")}. Alert ready for local paid performance option.`
        });
      }
    });
  });

  return matches;
}

function statusClass(status) {
  if (status === "Ready") return "paid";
  if (status === "Proof Needed") return "pending";
  return "rejected";
}

function showView(viewId) {
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === viewId);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-visible", view.id === viewId);
  });

  const active = document.querySelector(`.nav-tab[data-view="${viewId}"]`);
  $("#view-title").textContent = active?.textContent || "Join";
}

function fileName(form, name) {
  const file = form.get(name);
  return file && file.name ? file.name : "";
}

function fileNames(form, name) {
  return form.getAll(name).filter((file) => file?.name).map((file) => file.name).join(", ");
}

function validatePasswords(form, label = "profile") {
  const password = form.get("password");
  const passwordConfirm = form.get("passwordConfirm");
  const walletPassword = form.get("walletPassword");
  const walletPasswordConfirm = form.get("walletPasswordConfirm");

  if (password !== null && password !== passwordConfirm) {
    alert(`The ${label} passwords do not match.`);
    return false;
  }

  if (walletPassword !== null && walletPassword !== walletPasswordConfirm) {
    alert(`The ${label} wallet passwords do not match.`);
    return false;
  }

  return true;
}

function credentialFlags(form) {
  return {
    username: form.get("username")?.trim() || "",
    passwordConfigured: Boolean(form.get("password")),
    walletPasswordConfigured: Boolean(form.get("walletPassword")),
    termsAccepted: form.get("termsAccepted") === "on"
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-view]");
  if (navButton) showView(navButton.dataset.view);

  const toolButton = event.target.closest("[data-tool]");
  if (toolButton) {
    $("#tool-output").textContent = toolOutput(toolButton.dataset.tool);
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches('[name="plan"]')) {
    state.subscriber.plan = event.target.value;
    render();
  }
});

$("#search").addEventListener("input", renderIndex);

$("#signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "artist")) return;
  await runEvent("subscriber.created", {
    ...credentialFlags(form),
    artistName: form.get("artistName").trim(),
    email: form.get("email").trim(),
    genre: form.get("genre").trim(),
    goal: form.get("goal"),
    plan: form.get("plan"),
    trackingConsent: form.get("trackingConsent") === "on",
    ownershipAttestation: form.get("ownershipAttestation") === "on"
  });
  showView("upload");
});

$("#content-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("content.submitted", {
    title: form.get("title").trim(),
    isrc: form.get("isrc").trim(),
    upc: form.get("upc").trim(),
    linkRequest: form.get("linkRequest"),
    sampleUse: form.get("sampleUse"),
    sampleExplanation: form.get("sampleExplanation").trim(),
    releaseType: form.get("releaseType"),
    splitNote: form.get("splitNote").trim(),
    platformLinks: form.get("platformLinks").trim(),
    audioFile: fileNames(form, "audioFile"),
    visualFile: fileNames(form, "visualFile"),
    proofFile: fileNames(form, "proofFile"),
    documentFile: fileNames(form, "documentFile"),
    jpegFile: fileNames(form, "jpegFile"),
    videoFile: fileNames(form, "videoFile")
  });

  event.currentTarget.reset();
  showView("index");
});

$("#basic-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("basic.permissions.updated", {
    accountModel: form.get("accountModel"),
    artistSubscriptionPrice: Number(form.get("artistSubscriptionPrice")),
    stationName: form.get("stationName").trim(),
    audience: form.get("audience"),
    acceptPlatformSubscribers: form.get("acceptPlatformSubscribers") === "on",
    captchaEnabled: form.get("captchaEnabled") === "on",
    minorSafeTerms: form.get("minorSafeTerms") === "on",
    adultTerms: form.get("adultTerms") === "on"
  });
});

$("#subscription-exchange-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("basic.subscription.exchange.requested", {
    fromArtist: form.get("fromArtist").trim(),
    toArtist: form.get("toArtist").trim()
  });
  event.currentTarget.reset();
});

$("#fan-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "fan")) return;
  await runEvent("fan.profile.created", {
    ...credentialFlags(form),
    displayName: form.get("displayName").trim(),
    email: form.get("email").trim(),
    profilePicture: fileName(form, "profilePicture"),
    experience: form.get("experience"),
    visibility: form.get("visibility"),
    genres: form.getAll("genres"),
    expectationNote: form.get("expectationNote").trim(),
    searchConsent: form.get("searchConsent") === "on"
  });
  event.currentTarget.reset();
});

$("#cloud-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "cloud")) return;
  await runEvent("cloud.space.purchased", {
    ...credentialFlags(form),
    email: form.get("email").trim(),
    artistName: form.get("artistName").trim(),
    spacePackage: form.get("spacePackage")
  });
  event.currentTarget.reset();
});

$("#fan-tip-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("fan.tip.recorded", {
    artistName: form.get("artistName").trim(),
    tipValue: Number(form.get("tipValue")),
    coinValue: Number(form.get("coinValue")),
    supportPath: form.get("supportPath"),
    cashOutRate: Number(form.get("cashOutRate"))
  });
  event.currentTarget.reset();
});

$("#add-tracking-request").addEventListener("click", () => {
  const type = state.subscriber.plan === "protection" ? "Index search and enforcement" : "Royalty tracking review";
  addRequest(type);
});

$("#promotion-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "promotion")) return;
  await runEvent("promotion.profile.created", {
    ...credentialFlags(form),
    role: form.get("role"),
    name: form.get("name").trim(),
    email: form.get("email").trim(),
    city: form.get("city").trim(),
    radius: Number(form.get("radius")),
    genre: form.get("genre").trim(),
    budget: Number(form.get("budget")),
    gpsConsent: form.get("gpsConsent") === "on"
  });
  event.currentTarget.reset();
});

$("#gig-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("promotion.gig.created", {
    title: form.get("title").trim(),
    location: form.get("location").trim(),
    genre: form.get("genre").trim(),
    pay: Number(form.get("pay"))
  });
  event.currentTarget.reset();
});

$("#run-promotion-match").addEventListener("click", () => {
  runEvent("promotion.match.run");
});

$("#distribution-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("distribution.release.submitted", {
    billing: form.get("billing"),
    releaseTitle: form.get("releaseTitle").trim(),
    artistName: form.get("artistName").trim(),
    isrc: form.get("isrc").trim(),
    upc: form.get("upc").trim(),
    rightsBasis: form.get("rightsBasis"),
    targetPlatforms: form.get("targetPlatforms").trim(),
    audioFile: fileNames(form, "audioFile"),
    artworkFile: fileNames(form, "artworkFile"),
    proofFile: fileNames(form, "proofFile"),
    splitFile: fileNames(form, "splitFile"),
    videoFile: fileNames(form, "videoFile"),
    distributionAuthority: form.get("distributionAuthority") === "on",
    scanConsent: form.get("scanConsent") === "on"
  });
  event.currentTarget.reset();
});

$("#run-distribution-review").addEventListener("click", () => {
  runEvent("distribution.review.run");
});

$("#bitcoin-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "Bitcoin Tree")) return;
  await runEvent("bitcoin.tree.created", {
    ...credentialFlags(form),
    artistName: form.get("artistName").trim(),
    walletLabel: form.get("walletLabel").trim(),
    walletAddress: form.get("walletAddress").trim(),
    rootCoinPurchaseValue: Number(form.get("rootCoinPurchaseValue")),
    chainBlockSource: form.get("chainBlockSource").trim(),
    branchCoinSymbol: form.get("branchCoinSymbol").trim(),
    branchCoinSupply: Number(form.get("branchCoinSupply")),
    baseValueMultiplier: Number(form.get("baseValueMultiplier")),
    packageType: form.get("packageType"),
    supportGoal: Number(form.get("supportGoal")),
    vestingMonths: Number(form.get("vestingMonths")),
    fanRewardPercent: Number(form.get("fanRewardPercent")),
    dropAsset: fileName(form, "dropAsset"),
    campaignDescription: form.get("campaignDescription").trim(),
    riskConsent: form.get("riskConsent") === "on",
    legalReview: form.get("legalReview") === "on"
  });
  event.currentTarget.reset();
});

$("#run-bitcoin-projection").addEventListener("click", () => {
  runEvent("bitcoin.projection.run");
});

$("#partner-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "business partner")) return;
  await runEvent("partner.created", {
    ...credentialFlags(form),
    businessName: form.get("businessName").trim(),
    email: form.get("email").trim(),
    businessType: form.get("businessType"),
    annualPackage: Number(form.get("annualPackage")),
    seatLimit: Number(form.get("seatLimit")),
    lobbyName: form.get("lobbyName").trim(),
    termsAccepted: form.get("termsAccepted") === "on"
  });
  event.currentTarget.reset();
});

$("#partner-artist-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!validatePasswords(form, "partner artist")) return;
  await runEvent("partner.artist.registered", {
    ...credentialFlags(form),
    artistName: form.get("artistName").trim(),
    artistEmail: form.get("artistEmail").trim(),
    contractType: form.get("contractType"),
    accessPackage: form.get("accessPackage")
  });
  event.currentTarget.reset();
});

$("#deal-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await runEvent("partner.deal.created", {
    title: form.get("title").trim(),
    artistName: form.get("artistName").trim(),
    dealValue: Number(form.get("dealValue"))
  });
  event.currentTarget.reset();
});

$("#run-partner-market").addEventListener("click", () => {
  runEvent("partner.market.snapshot");
});

$("#support-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  $("#support-answer").textContent = supportAnswer(form.get("issue"));
});

$("#reset-demo").addEventListener("click", () => {
  runEvent("runtime.reset");
  showView("join");
});

$("#tool-output").textContent = "Choose a launch tool to generate marketing, artwork, rights, or fan subscription guidance.";
render();
syncFromRuntime();
