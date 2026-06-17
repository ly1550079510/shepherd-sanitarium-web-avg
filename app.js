(() => {
  const STORAGE_KEY = "shepherd_sanitarium_degree2_state";
  const SLOT_KEY = "shepherd_sanitarium_degree2_slots";
  const app = document.querySelector("#app");
  const STORY_DATA = window.SHEPHERD_STORY_DATA || {};
  const ENTITIES = STORY_DATA.entities || {};
  const ROLE_DEFS = STORY_DATA.roleDefs || {};
  const SLOT_META = STORY_DATA.slotMeta || {};
  const PASSWORD_WORDS = STORY_DATA.passwordWords || ["OVIS", "LUSUS", "PASTOR", "SOMNIUM"];
  const SLOT_ORDER = STORY_DATA.slotOrder || Object.keys(SLOT_META);
  const LOCATION_GLOSSARY = STORY_DATA.locationGlossary || [];
  const NARRATIVE_DATA = window.SHEPHERD_NARRATIVE_DATA || {};
  const STAGE_NARRATIVE = window.SHEPHERD_STAGE_NARRATIVE || {};
  const OVERLAY_NARRATIVE = window.SHEPHERD_OVERLAY_NARRATIVE || {};
  const SLOT_STAKES = NARRATIVE_DATA.slotStakes || {};
  const INTRO_NOTICES = NARRATIVE_DATA.introNotices || {};
  const RECOVERY_COPY = NARRATIVE_DATA.recoveryCopy || {};
  const FATAL_COPY = NARRATIVE_DATA.fatalCopy || {};
  const PROSE_CONFIG = NARRATIVE_DATA.proseConfig || {};
  const ROLE_SLOT_BASES = PROSE_CONFIG.roleSlotBases || {};
  const ANJIE_SLOT_BASE = ROLE_SLOT_BASES.anjie || {};
  const PATRICK_SLOT_BASE = ROLE_SLOT_BASES.patrick || {};
  const GENERIC_ROLE_SLOT_BASES = ROLE_SLOT_BASES.genericRoleBases || PROSE_CONFIG.genericRoleBases || {};
  const ROLE_ACTION_DETAILS = PROSE_CONFIG.roleActionDetails || ROLE_SLOT_BASES.roleActionDetails || GENERIC_ROLE_SLOT_BASES.roleActionDetails || {};
  const GENERIC_ROLE_ACTION_DETAILS = ROLE_ACTION_DETAILS;
  const ANJIE_ACTION_DETAILS = ROLE_ACTION_DETAILS.anjie || [];
  const PATRICK_ACTION_DETAILS = ROLE_ACTION_DETAILS.patrick || [];
  const ROUTE_PARAGRAPH_LIMIT = 240;
  const PATRICK_PARAGRAPH_LIMIT = 240;
  const PAGED_ROUTE_IDS = new Set(["patrick", "anjie", "yamada", "debora", "fan", "ziche"]);
  const COMPACT_RESULT_ROUTE_IDS = new Set(["yamada", "debora", "fan", "ziche"]);
  const buildAnjieSlotStageLines = STAGE_NARRATIVE.buildAnjieSlotStageLines || (() => []);
  const buildPatrickSlotStageLines = STAGE_NARRATIVE.buildPatrickSlotStageLines || (() => []);
  const buildYamadaSlotStageLines = STAGE_NARRATIVE.buildYamadaSlotStageLines || (() => []);
  const buildDeboraSlotStageLines = STAGE_NARRATIVE.buildDeboraSlotStageLines || (() => []);
  const buildFanSlotStageLines = STAGE_NARRATIVE.buildFanSlotStageLines || (() => []);
  const buildZicheSlotStageLines = STAGE_NARRATIVE.buildZicheSlotStageLines || (() => []);
  const buildAnjieAnchorOverlayLines = OVERLAY_NARRATIVE.buildAnjieAnchorOverlayLines || (() => []);
  const buildPatrickAnchorOverlayLines = OVERLAY_NARRATIVE.buildPatrickAnchorOverlayLines || (() => []);
  const buildYamadaAnchorOverlayLines = OVERLAY_NARRATIVE.buildYamadaAnchorOverlayLines || (() => []);
  const buildDeboraAnchorOverlayLines = OVERLAY_NARRATIVE.buildDeboraAnchorOverlayLines || (() => []);

  const BASE_OPTIONS = structuredClone(window.BRANCH_OPTIONS || {});
  BASE_OPTIONS.patrick = BASE_OPTIONS.patrick || {};
  BASE_OPTIONS.patrick["2.4"] = BASE_OPTIONS.patrick["2.4"] || {
    A: "在众人第一次汇总线索时，她将四个拉丁词拆开念诵，试图辨认哪一个更像写给门外世界的悼词。",
    B: "她私下拉住安洁，把自己在焚烧房与藤蔓前感到的“脉搏”告诉对方，请她用更冷静的逻辑替自己校准这份灵感。",
    C: "**【休息】** 她独自停在灯影尽头，缓慢调匀呼吸，聆听大厅外每一阵脚步里夹带的心跳，像在等待一位迟来的亡者。",
  };

  const DEFAULT_RELATIONS = Object.keys(ENTITIES).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  const SUSPICION_SUBJECTS = ["player", ...Object.keys(ENTITIES)];
  const STORY_ANCHORS = STORY_DATA.storyAnchors || {
    firstGather: "1.2",
    secondGather: "2.4",
    meruruDeath: "3.3",
    finalVote: "4.4",
    patrickAwakening: "5.1",
  };
  const SLOT_POSITION_BLUEPRINTS = STORY_DATA.slotPositionBlueprints || {};
  const OPTION_MODULES = compileOptionModules(BASE_OPTIONS);
  const FALLBACK_ROLE_ID = Object.keys(ROLE_DEFS)[0] || null;
  const STORY_DATA_ISSUES = [
    !app && "#app 容器缺失",
    !Object.keys(ENTITIES).length && "entities 缺失",
    !Object.keys(ROLE_DEFS).length && "roleDefs 缺失",
    !Object.keys(SLOT_META).length && "slotMeta 缺失",
    !SLOT_ORDER.length && "slotOrder 缺失",
  ].filter(Boolean);

  if (!app) {
    console.error("[Shepherd] Missing #app container.");
    return;
  }








  let audioCtx = null;
  let state = createBootState();

  if (STORY_DATA_ISSUES.length) {
    renderFatal(null, [
      "页面已拦截本次启动，避免在缺少故事数据时进入白屏状态。",
      `缺失项：${STORY_DATA_ISSUES.join(" / ")}`,
      "请确认 `story-data.js` 已成功加载且位于 `app.js` 之前。",
    ]);
    return;
  }

  function defaultState() {
    return {
      screen: "title",
      overlay: null,
      selectedRole: null,
      slotIndex: 0,
      phase: "decision",
      scenePage: 0,
      scene: null,
      notice: "",
      fast: false,
      sound: true,
      route: [],
      log: [],
      archive: {},
      autosave: false,
      finished: false,
      outcome: null,
      stats: { hp: 10, mp: 10, san: 65, fatigue: 0, truth: 0, exposure: 0, alertness: 0 },
      maxStats: { hp: 10, mp: 10, san: 99 },
      generators: { progress: 0, words: [] },
      relations: structuredClone(DEFAULT_RELATIONS),
      suspicion: {},
      visits: {},
      clues: [],
      items: [],
      keyChoices: {},
      alliances: {},
      npcPositions: {},
      playerPosition: null,
      flags: {
        meruruDead: false,
        meruruBlessing: false,
        emilyProtected: false,
        patrickBond: false,
        patrickMercy: false,
        patrickAwakened: false,
        karlExposed: 0,
        playerMarked: false,
        voteOutcome: null,
        voteTarget: null,
        gateReady: false,
        truthSeen: 0,
      },
    };
  }

  function createBootState() {
    const saved = loadState();
    const boot = normalizeState(saved || defaultState());
    boot.screen = "title";
    boot.overlay = null;
    return boot;
  }

  function normalizeState(input) {
    const base = defaultState();
    const roleId = input?.selectedRole && ROLE_DEFS[input.selectedRole] ? input.selectedRole : null;
    const role = roleId ? ROLE_DEFS[roleId] : null;
    const merged = {
      ...base,
      ...input,
      stats: { ...base.stats, ...(input?.stats || {}) },
      maxStats: role ? { hp: role.stats.hp, mp: role.stats.mp, san: 99 } : { ...base.maxStats, ...(input?.maxStats || {}) },
      generators: { ...base.generators, ...(input?.generators || {}) },
      relations: { ...structuredClone(DEFAULT_RELATIONS), ...(input?.relations || {}) },
      suspicion: normalizeSuspicionMap(input?.suspicion),
      visits: { ...(input?.visits || {}) },
      flags: { ...base.flags, ...(input?.flags || {}) },
      archive: { ...(input?.archive || {}) },
      items: Array.isArray(input?.items) ? input.items : [],
      keyChoices: { ...(input?.keyChoices || {}) },
      alliances: { ...(input?.alliances || {}) },
      npcPositions: { ...(input?.npcPositions || {}) },
      playerPosition: input?.playerPosition || null,
      route: Array.isArray(input?.route) ? input.route : [],
      log: Array.isArray(input?.log) ? input.log : [],
    };
    merged.screen = ["title", "select", "archive", "game", "end"].includes(merged.screen) ? merged.screen : "title";
    merged.phase = merged.phase === "result" ? "result" : "decision";
    merged.overlay = ["log", "save"].includes(merged.overlay) ? merged.overlay : null;
    merged.scenePage = clamp(Number(merged.scenePage || 0), 0, 99);
    if (role) {
      merged.selectedRole = roleId;
      merged.maxStats.hp = role.stats.hp;
      merged.maxStats.mp = role.stats.mp;
      merged.stats.hp = clamp(merged.stats.hp, 0, merged.maxStats.hp);
      merged.stats.mp = clamp(merged.stats.mp, 0, merged.maxStats.mp);
    } else {
      merged.selectedRole = null;
      if (merged.screen === "game" || merged.screen === "end") merged.screen = "title";
      merged.phase = "decision";
      merged.scene = null;
    }
    merged.slotIndex = clamp(Number(merged.slotIndex || 0), 0, SLOT_ORDER.length - 1);
    merged.generators.progress = clamp(Number(merged.generators.progress || 0), 0, 4);
    merged.generators.words = Array.isArray(merged.generators.words) ? merged.generators.words.slice(0, 4) : [];
    merged.stats.san = clamp(Number(merged.stats.san || 0), 0, 99);
    merged.stats.fatigue = clamp(Number(merged.stats.fatigue || 0), 0, 10);
    merged.stats.truth = clamp(Number(merged.stats.truth || 0), 0, 9);
    merged.stats.exposure = clamp(Number(merged.stats.exposure || 0), 0, 100);
    merged.stats.alertness = clamp(Number(merged.stats.alertness || 0), 0, 100);
    merged.items = [...new Set(merged.items)];
    merged.clues = [...new Set(Array.isArray(merged.clues) ? merged.clues : [])];
    if (!merged.scene || !Array.isArray(merged.scene.paragraphs)) {
      merged.scene = null;
      merged.scenePage = 0;
    }
    if (merged.phase === "result" && !merged.scene) {
      merged.phase = "decision";
      merged.notice = merged.notice || "已从旧版存档恢复到本时段开始前，以避免结果页数据缺失导致白屏。";
    }
    merged.playerPosition = merged.playerPosition || ROLE_DEFS[merged.selectedRole || FALLBACK_ROLE_ID]?.startRoom || null;
    merged.npcPositions = normalizeNpcPositions(merged.npcPositions, SLOT_ORDER[merged.slotIndex], merged.selectedRole, merged.playerPosition);
    return merged;
  }

  function initRoleState(roleId) {
    const next = defaultState();
    const role = ROLE_DEFS[roleId];
    next.screen = "game";
    next.selectedRole = roleId;
    next.maxStats = { hp: role.stats.hp, mp: role.stats.mp, san: 99 };
    next.stats = {
      hp: role.stats.hp,
      mp: role.stats.mp,
      san: role.stats.san,
      fatigue: 0,
      truth: 0,
      exposure: 0,
      alertness: 0,
    };
    next.relations = { ...structuredClone(DEFAULT_RELATIONS), [roleId]: 100 };
    next.suspicion = normalizeSuspicionMap();
    next.playerPosition = role.startRoom;
    next.npcPositions = normalizeNpcPositions({}, SLOT_ORDER[0], roleId, role.startRoom);
    if (roleId === "anjie") {
      next.relations.patrick = 8;
    }
    if (roleId === "patrick") {
      next.relations.anjie = 8;
      next.relations.meruru = 6;
    }
    if (roleId === "yamada") {
      next.relations.emily = 6;
    }
    return next;
  }

  function normalizeSuspicionMap(source = {}) {
    const map = {};
    SUSPICION_SUBJECTS.forEach((observer) => {
      map[observer] = {};
      SUSPICION_SUBJECTS.forEach((subject) => {
        map[observer][subject] = clamp(Number(source?.[observer]?.[subject] || 0), 0, 100);
      });
    });
    return map;
  }

  function normalizeNpcPositions(source = {}, slotId, roleId, playerPosition) {
    const blueprint = SLOT_POSITION_BLUEPRINTS[slotId] || {};
    const merged = { ...blueprint, ...(source || {}) };
    Object.keys(ENTITIES).forEach((id) => {
      if (id === roleId) return;
      if (!merged[id]) {
        merged[id] = blueprint[id] || ROLE_DEFS[id]?.startRoom || "A12";
      }
    });
    if (roleId) {
      merged[roleId] = playerPosition || ROLE_DEFS[roleId]?.startRoom || merged[roleId];
    }
    return merged;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn(error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function loadSlots() {
    try {
      const raw = localStorage.getItem(SLOT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveSlots(data) {
    try {
      localStorage.setItem(SLOT_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn(error);
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function currentRole() {
    return ROLE_DEFS[state.selectedRole] || ROLE_DEFS[FALLBACK_ROLE_ID] || null;
  }

  function currentSlotId() {
    return SLOT_ORDER[state.slotIndex] || SLOT_ORDER[0] || null;
  }

  function currentSlotMeta() {
    const slotId = currentSlotId();
    return slotId ? SLOT_META[slotId] || null : null;
  }

  function unlockedCount() {
    return Object.keys(state.archive || {}).filter((key) => state.archive[key]).length;
  }

  function resetToTitle() {
    state.screen = "title";
    state.overlay = null;
    state.phase = state.finished ? "decision" : state.phase;
    state.scenePage = 0;
    persist();
    render();
  }

  function startNew() {
    state = normalizeState(defaultState());
    state.screen = "select";
    persist();
    render();
  }

  function resumeLast() {
    const saved = loadState();
    if (!saved?.selectedRole) return;
    state = normalizeState(saved);
    state.overlay = null;
    state.scenePage = state.phase === "result" ? clamp(Number(state.scenePage || 0), 0, 99) : 0;
    state.screen = state.selectedRole ? (state.finished ? "end" : "game") : "title";
    persist();
    render();
  }

  function beginRole(roleId) {
    state = normalizeState(initRoleState(roleId));
    state.notice = buildIntroNotice(roleId);
    state.autosave = true;
    persist();
    render();
  }

  function buildIntroNotice(roleId) {
    if (roleId === "fan") return "对讲机里那个弱气女声已经把“恶狼”的身份递到你手里。你不打算照她的名字来理解自己。";
    if (roleId === "ziche") return "房门、墙角和红灯都先被你算进逃生路线。你还没相信任何人，也还不需要。";
    if (roleId === "yamada") return "你先把表情调成最合适的样子，再决定该把哪一部分真实藏进袖口里。";
    if (roleId === "anjie") return "你把笔记本摊开在膝上，像是在给一场迟到的自证准备证据。";
    if (roleId === "debora") return "你知道“装成无害”比“装成强大”更容易让人忽略真正的危险。";
    return "你已经听见这栋楼最轻的那层回声了。先别急着解释，先记住它是从哪边贴过来的。";
  }

  function getRoleOptions(roleId, slotId) {
    const fromDoc = BASE_OPTIONS?.[roleId]?.[slotId];
    if (fromDoc) return fromDoc;
    return {
      A: "前往你认为最关键的地点，主动推进线索。",
      B: "与最值得注意的人接触，尝试改变关系。",
      C: "**【休息】** 暂停动作，整理思路，听任别处的事件先一步发生。",
    };
  }

  function getOptionModule(roleId, slotId, optionKey) {
    return OPTION_MODULES?.[roleId]?.[slotId]?.[optionKey] || null;
  }

  function compileOptionModules(baseOptions) {
    const modules = {};
    Object.entries(baseOptions || {}).forEach(([roleId, slots]) => {
      modules[roleId] = {};
      Object.entries(slots || {}).forEach(([slotId, options]) => {
        modules[roleId][slotId] = {};
        Object.entries(options || {}).forEach(([optionKey, label]) => {
          modules[roleId][slotId][optionKey] = createOptionModule(roleId, slotId, optionKey, label);
        });
      });
    });
    return modules;
  }

  function createOptionModule(roleId, slotId, optionKey, label) {
    const clean = stripRestLabel(label);
    const targets = findTargets(clean);
    const location = findLocation(clean, slotId);
    const tags = deriveTags(clean, optionKey);
    return {
      id: `${roleId}:${slotId}:${optionKey}`,
      roleId,
      slotId,
      optionKey,
      rawLabel: label,
      cleanLabel: clean,
      location,
      targets,
      tags,
      branchClass: classifyBranch(tags, clean, slotId),
      urgency: inferUrgency(tags, clean, slotId),
      focus: inferFocus(clean, targets, location, tags),
      memoryHooks: inferMemoryHooks(clean, tags, targets, location),
      proseHooks: inferProseHooks(clean, tags, targets, location),
      motifs: inferNarrativeMotifs(clean, tags, targets, location, slotId),
    };
  }

  function deriveTags(clean, optionKey) {
    const tags = [];
    if (optionKey === "C" || clean.includes("休息")) tags.push("rest");
    if (/发电机|电闸|破译|密码/.test(clean)) tags.push("generator");
    if (/交谈|询问|安慰|祝福|祈祷|告解|劝告|坦诚|结盟|递给|告诉|靠近|搭话|试图理解|按手/.test(clean)) tags.push("social");
    if (/攻击|炸|破坏|挡住|断后|开枪|威胁|指控|划伤|弄伤|逼迫|拖延|同归于尽/.test(clean)) tags.push("attack");
    if (/展示|公开|发表|演说|宣布|分享|主导叙事|辩护/.test(clean)) tags.push("public");
    if (/观察|检查|搜索|调查|寻找|发现|聆听|偷听|记录|回想|整理|分析|占卜|通灵/.test(clean)) tags.push("investigate");
    if (/匕首|眼球|戒指|日记|遗言|手链|病历|书籍|对讲机/.test(clean)) tags.push("item");
    if (/投票|投给|弃权|辩论|处刑/.test(clean)) tags.push("vote");
    if (/帮助|保护|护送|守护|照顾|安抚|留下来帮助/.test(clean)) tags.push("protect");
    if (/祈祷|圣经|主|亡魂|通灵|占卜|仪式|灵魂|母神/.test(clean)) tags.push("occult");
    return tags;
  }

  function classifyBranch(tags, clean, slotId) {
    if (slotId === STORY_ANCHORS.finalVote) return "verdict";
    if (slotId === "5.4") return "ending";
    if (tags.includes("rest")) return "rest";
    if (tags.includes("attack")) return "conflict";
    if (tags.includes("generator")) return "system";
    if (tags.includes("social") || tags.includes("protect")) return "encounter";
    if (tags.includes("investigate") || tags.includes("item")) return "discovery";
    if (slotId === STORY_ANCHORS.secondGather || slotId === STORY_ANCHORS.meruruDeath || slotId === STORY_ANCHORS.patrickAwakening) return "anchor";
    return "exploration";
  }

  function inferUrgency(tags, clean, slotId) {
    let value = 1;
    if (tags.includes("attack") || tags.includes("vote")) value += 2;
    if (tags.includes("generator") || tags.includes("protect")) value += 1;
    if (slotId === STORY_ANCHORS.meruruDeath || slotId === STORY_ANCHORS.finalVote || slotId === STORY_ANCHORS.patrickAwakening) value += 2;
    if (/立刻|马上|直接|毫不犹豫|冲向/.test(clean)) value += 1;
    return clamp(value, 1, 5);
  }

  function inferFocus(clean, targets, location, tags) {
    if (targets.length) return `人物:${targets.map((id) => ENTITIES[id]?.short || id).join("/")}`;
    if (tags.includes("generator")) return "系统:发电机";
    if (tags.includes("vote")) return "系统:投票";
    if (tags.includes("rest")) return "内心:休息";
    if (location?.code) return `地点:${location.code}`;
    return "局势:泛化";
  }

  function formatFocusLabel(focus) {
    if (!focus) return "";
    const [type, rawValue = ""] = String(focus).split(":");
    if (type === "人物") {
      const names = rawValue
        .split("/")
        .filter(Boolean)
        .map((token) => ENTITIES[token]?.short || token);
      return names.length ? `人物 · ${names.join(" / ")}` : "人物 · 未知";
    }
    if (type === "地点") return `地点 · ${rawValue}`;
    if (type === "系统") return `系统 · ${rawValue}`;
    if (type === "内心") return `内心 · ${rawValue}`;
    if (type === "局势") return `局势 · ${rawValue}`;
    return String(focus).replace(/:/g, " · ");
  }

  function compactDecisionLabel(roleId, slotId, label) {
    const clean = stripRestLabel(label);
    const isRest = /【休息】/.test(clean);
    const restMap = {
      fan: {
        "1.1": "抱紧十字架祈祷",
        "1.2": "躲角落默祷",
        "1.3": "背诵羔羊经文",
        "1.4": "为众人默念主祷文",
        "2.1": "黑暗里做告解",
        "2.2": "写赦免名单",
        "2.3": "伏地承受试炼",
        "2.4": "离群做苦路善工",
        "3.1": "躲进黑暗崩溃",
        "3.2": "沉进圣母幻象",
        "3.3": "背诵亲族名字",
        "3.4": "虚脱瘫在长椅",
        "4.1": "石桌前长祷",
        "4.2": "请子车判你是否该死",
        "4.3": "闭眼进入恍惚",
        "4.4": "蜷缩承受结果",
        "5.1": "站在原地哭到失声",
        "5.2": "倒地等候裁决",
        "5.3": "抱圣经闭眼等待",
        "5.4": "站在白门前不挣扎",
      },
      ziche: {
        "1.1": "闭眼听门外动静",
        "1.2": "坐远端盯死全场",
        "1.3": "靠墙给旧伤换药",
        "1.4": "磨尖铁棍",
        "2.1": "清点手里所有武器",
        "2.2": "胡乱给伤口涂药",
        "2.3": "画逃跑路线图",
        "2.4": "练到一抽就能出棍",
        "3.1": "站在尸体旁算威胁",
        "3.2": "躲进监控房查录像",
        "3.3": "坐进救护车闭眼缓气",
        "3.4": "画防迷路标记",
        "4.1": "门外擦武器柄",
        "4.2": "重排全身负重顺序",
        "4.3": "闭眼养神不松棍",
        "4.4": "收紧装备等着狂奔",
        "5.1": "站住一秒算怪物速度",
        "5.2": "停下来压住喘息",
        "5.3": "翻路线本发现无路可走",
        "5.4": "回头把地狱刻进脑子",
      },
      yamada: {
        "1.1": "对墙发呆戴回面具",
        "1.2": "装发呆给所有人打分",
        "1.3": "装睡偷听路过谈话",
        "1.4": "远远守着艾米莉",
        "2.1": "装发呆监视进出",
        "2.2": "躲进暗处独自坐一会",
        "2.3": "摊开纸条拼逻辑链",
        "2.4": "离群压回暴力念头",
        "3.1": "盯着尸体掐住掌心",
        "3.2": "靠冰柜强行冷静",
        "3.3": "靠墙露出真实疲态",
        "3.4": "蜷起身体短暂崩溃",
        "4.1": "低头刮着椅扶手",
        "4.2": "贴着艾米莉取暖",
        "4.3": "攥拳到掌心见血",
        "4.4": "背身无声掉泪",
        "5.1": "僵住却不松开她的手",
        "5.2": "坐在冰柜旁听惨叫",
        "5.3": "按着胸口忍住崩塌",
        "5.4": "靠门坐下等最后时刻",
      },
      debora: {
        "1.1": "捂脸假哭观察房间",
        "1.2": "缩在椅上偷听关键词",
        "1.3": "陷进沙发装累",
        "1.4": "抱着干粮埋头猛吃",
        "2.1": "躺在沙发上真睡过去",
        "2.2": "靠墙哼跑调老歌",
        "2.3": "盖住脸蜷成一团",
        "2.4": "在炉火边打盹",
        "3.1": "在尸体旁守着悲伤",
        "3.2": "盯着破洞发作头痛",
        "3.3": "坐湖边看陌生倒影",
        "3.4": "站在门前沉默想密码",
        "4.1": "胃疼蜷着等审判",
        "4.2": "翻出口袋硬吞胃药",
        "4.3": "摸着对讲机终究没开口",
        "4.4": "瘫在椅上被抽空",
        "5.1": "跪地失去腿上的力",
        "5.2": "隔着车窗看清自己",
        "5.3": "写下账户密码清单",
        "5.4": "坐在门外台阶看天塌",
      },
    };
    if (isRest) {
      return ensureSecondPersonChoice(restMap[roleId]?.[slotId] || clean.replace(/^【休息】\s*/, ""));
    }
    const tokenMap = [
      [/在大厅集会时.*瘫坐在椅子上.*附和别人/, "大厅瘫坐附和"],
      [/对所有看起来很强势的人.*往后躲/, "躲开强势的人"],
      [/如果遇到别人.*阿姨我年纪大了.*待着/, "装老躲着"],
      [/如果遇到其他人.*阿姨我年纪大了.*待着/, "装老躲着"],
      [/听到梅露露的死讯后.*寻找凶器.*痕迹/, "先查死讯现场"],
      [/听到梅露露的死讯后.*开始哭/, "听死讯后哭"],
      [/在追查凶手的过程中.*跟不上.*干着急/, "跟不上推理"],
      [/当子车突然指认卡尔时.*劝双方冷静/, "劝双方冷静"],
      [/开始劝说他人.*不要被仇恨蒙蔽/, "劝愤怒的人"],
      [/如果有人对她表现出明显的敌意.*我原谅你/, "靠近敌意者说原谅"],
      [/公开将自己找到的“眼球”放在桌子中央.*胡言乱语/, "摆眼球当见证"],
      [/主动承担破译发电机的任务|协助破译发电机|参与破译发电机/, "破译发电机"],
      [/在大厅集会时.*观察所有人的互动|观察所有人的互动|用余光扫视每一个人/, "观察大厅众人"],
      [/主动与看起来最没攻击性的艾米莉搭话|跟在艾米莉身后|紧跟在艾米莉身边/, "靠近艾米莉"],
      [/独自前往A18.*藏书馆|前往A18.*藏书馆|顺着那股异气翻书/, "去藏书馆查资料"],
      [/发现卡尔在逼问梅露露.*偷听|偷听.*梅露露/, "偷听卡尔与梅露露"],
      [/主动找到子车.*交换房间分布的情报|找到子车.*交换/, "找子车换情报"],
      [/只分享部分情报.*隐瞒.*戒指/, "藏下戒指线索"],
      [/找到艾米莉.*别乱说话/, "命令艾米莉跟紧你"],
      [/听到梅露露的死讯后.*开始分析/, "听死讯后先算阵营"],
      [/挽住艾米莉的手|抓起艾米莉的手腕|拉着艾米莉/, "拉住艾米莉逃生"],
      [/诱导式的方式提问|不会直接指控/, "诱导众人自己说出怀疑"],
      [/频繁地与持有对讲机的人保持联系/, "搭建对讲机情报网"],
      [/检查车门和车钥匙|仔细检查车门和车钥匙/, "检查救护车"],
      [/进行最后的游说|最后的自由时间.*布局/, "投票前最后游说"],
      [/将时间线证据公之于众|巧妙地将嫌疑锁定/, "公开时间线证据"],
      [/找塔比瑟.*带艾米莉走/, "托塔比瑟带走艾米莉"],
      [/说出关于他妻子珍妮的真相/, "揭出珍妮真相逼卡尔失控"],
      [/在所有人的脑海中播放.*录音/, "播放罗伯特录音"],
      [/投给了卡尔/, "把票投给卡尔"],
      [/选择了弃权/, "拒绝参与这场投票"],
      [/选择了一个与主要人群相反的方向跑|用声音和敲击制造混乱/, "反向引怪替人群断路"],
      [/推倒书柜制造障碍/, "推倒书柜躲进壁炉后"],
      [/将对讲机开到最大音量.*扔进B2/, "扔下对讲机制造坠落假象"],
      [/试图用.*救护车作为掩体/, "躲进救护车后观察"],
      [/向着派翠克大喊.*引到远离艾米莉/, "大喊引怪离开艾米莉"],
      [/将她推向那片白光/, "把艾米莉推进白门"],
      [/戴上它.*独自一人/, "戴上红绳独自走向门"],
      [/惊慌失措地拍打电子闸门/, "拍门呼救装崩溃"],
      [/对讲机广播时.*老阿姨|没用的程序员/, "对讲机里装无害阿姨"],
      [/独自前往A19.*找吃的|确认.*武器或工具/, "去储物室摸工具"],
      [/冲上去打圆场/, "冲上去给梅露露圆场"],
      [/主动提出照顾.*安洁/, "主动留在安洁身边"],
      [/选择了一条看似安全.*路线/, "挑近大厅的安全路线"],
      [/夸张的干呕和恐惧/, "在血迹前装到不敢前进"],
      [/在大家激烈讨论时.*尴尬地陪着笑脸/, "在旁边陪笑装外行"],
      [/提出暴力方案时.*和和气气/, "劝人别动火气"],
      [/被分配去协助破译发电机.*束手无策/, "在发电机前装不会"],
      [/停电.*发出最尖锐的惊叫/, "停电时抓住最近的人尖叫"],
      [/追问.*神.*吃人吗/, "追问神会不会吃人"],
      [/大家.*分头行动时.*反对/, "反对大家分头行动"],
      [/讲述生命的无常|不要再互相猜忌/, "哭过后劝众人别再互猜"],
      [/公开.*专业素养|专业术语分析/, "突然暴露爆破专业素养"],
      [/突然转变表示惊讶.*废物阿姨/, "装傻把专业话圆回去"],
      [/试图找到子车.*寻求对方的意见/, "去问子车该信谁"],
      [/破解对讲机的频道/, "破解对讲机私密频道"],
      [/始终保持沉默.*可怜兮兮/, "沉默到矛头指向自己"],
      [/始终保持沉默.*为自己辩解/, "沉默挨审后再小声辩解"],
      [/默默地流眼泪.*故事而动容/, "在旁落泪看卡尔挨质问"],
      [/眼神一直在躲闪.*不敢与任何人对视/, "躲着视线听完指控"],
      [/曾经隐瞒了对讲机损坏/, "承认隐瞒对讲机损坏"],
      [/小声地问旁边的子车/, "悄悄问子车该投谁"],
      [/轻轻地拉住卡尔的衣袖/, "拉住卡尔别再失控"],
      [/选择了卡尔/, "按逻辑把票投给卡尔"],
      [/选择了派翠克/, "把票投给派翠克"],
      [/冲到A20.*确认.*梅露露的尸体/, "回头确认梅露露尸体"],
      [/死死抓着子车/, "死死抓住子车求活"],
      [/主动担任破解最后一台发电机的任务/, "去破最后一台发电机"],
      [/制作燃烧瓶/, "现场做燃烧瓶"],
      [/将最后的密码告诉山田.*我留在这里断后/, "把密码交给山田自己断后"],
      [/捡起他掉落的武器/, "捡起遗武硬撑着面对怪物"],
      [/最后一个踏进那片白光/, "最后一个穿过白门"],
      [/转身去接应/, "回头接应没到的人"],
      [/仔细检查对讲机.*神学/, "对讲机里追问神学"],
      [/冗长.*祷告|进行一段.*祷告/, "跪地做长祷"],
      [/主动走向看起来最恐惧的人/, "安抚最恐惧的人"],
      [/仔细观察.*最后的晚餐.*壁画/, "研究亵渎壁画"],
      [/前往A14.*默想之地/, "去审讯室默想痛苦"],
      [/接近.*卡尔.*承担这罪/, "对卡尔说愿替他背罪"],
      [/将其视为某种圣物/, "捧着眼球当圣物"],
      [/找到子车或狄波拉.*为他们祈祷/, "问别人要不要为其祈祷"],
      [/前往A21.*焚烧房/, "去焚烧房寻求净化"],
      [/主动上前介入.*爱你的仇敌/, "用身体拦下争吵双方"],
      [/展示.*狼群永存.*戒指/, "拿戒指出去讲罪与牧羊人"],
      [/尝试与梅露露交谈/, "向梅露露确认治愈是否神迹"],
      [/将一切超自然现象解释为/, "把超自然都讲成考验"],
      [/通过按手祷告/, "按手替安洁祈祷"],
      [/在尸体旁长时间跪下/, "在尸体旁反复诵安魂祷文"],
      [/模仿耶稣受难前的姿态/, "模仿受难姿态"],
      [/发表一些关于.*杀人者也是可怜的罪人/, "公开主张凶手也该被宽恕"],
      [/找到一些尖锐的物品.*弄伤自己/, "故意弄伤自己保持清醒"],
      [/劝说他人向善/, "劝愤怒的人别被仇恨蒙眼"],
      [/凝视着天空中的异常/, "去门外仰望异象天幕"],
      [/主动找到每一个人.*临终关怀/, "逐个做临终关怀式交谈"],
      [/公开宣布自己已代替所有人/, "公开赦免名单"],
      [/发表一番冗长的演说.*暗示自己/, "演说并暗示自己该死"],
      [/递给他一个十字架/, "把十字架递给卡尔"],
      [/引用圣经进行辩护/, "用经文回应所有指控"],
      [/找到派翠克.*如果你的匕首需要血/, "请求派翠克用你的血"],
      [/开始向众人分发.*布条/, "撕布条发给众人当护身符"],
      [/坚定地选择了自己/, "把票投给自己"],
      [/选择.*弃权.*谁没有罪/, "弃权并质问谁没有罪"],
      [/逆着人流冲向正在觉醒的派翠克/, "逆着人流拥向派翠克"],
      [/留下来帮助行动不便.*受伤的人|留下来帮助行动不便的人/, "留下照看伤者"],
      [/主动提议用自己的身体作为.*诱饵/, "提议用自己当诱饵"],
      [/用打火机点燃附近的汽油/, "点燃汽油和怪物同归于尽"],
      [/将密码和所有物品交给他/, "把密码和物品交给子车"],
      [/向每一个遇到的人.*我原谅你/, "向所有相遇者说原谅"],
      [/用身体挡住派翠克/, "用身体挡住派翠克"],
      [/拒绝踏出大门一步/, "转身走向怪物"],
      [/粗暴地检查电子闸门/, "粗查闸门厚度"],
      [/态度恶劣地打断对方/, "对讲机里逼问幕后人"],
      [/走到最不起眼的角落.*背靠墙壁/, "背靠墙站住全场死角"],
      [/翻找能用的工具或撬棍/, "翻金属柜找撬棍"],
      [/暴力撬开上锁的箱子/, "暴力撬箱找武器"],
      [/极其冷淡的语气回怼/, "冷冷顶回命令人"],
      [/暴力拆解刑具上的铁链/, "拆刑具上的铁链"],
      [/设置简单的绊索陷阱/, "在走廊布置绊索"],
      [/无视尸体和文件.*检查焚烧炉/, "检查焚烧炉结构"],
      [/远远地站着听.*谁在结盟/, "远听争吵分析结盟"],
      [/威逼利诱的方式交换.*出口/, "逼换出口情报"],
      [/用铁棍敲打墙壁/, "敲墙找空心位置"],
      [/研究如何让电闸.*永远无法被修复/, "研究怎么废掉电闸"],
      [/不会安慰.*别死在我面前/, "对弱者说别死在你面前"],
      [/复述事实.*隐瞒掉关于.*秘密出口|武器/, "复述事实但藏下出口武器"],
      [/结成.*肌肉同盟/, "和卡尔提议肌肉同盟"],
      [/迅速调查现场.*寻找凶器/, "先查现场找凶器"],
      [/公开宣称.*谁靠近我背后/, "公开警告谁靠近就杀谁"],
      [/不带感情的方式对卡尔进行指控/, "平静列证指向卡尔"],
      [/找到一个制高点.*埋伏/, "占住高点等凶手露头"],
      [/加强自己周边的防御/, "封死一间房门"],
      [/问.*你手上有几个对讲机/, "向山田强要一个对讲机"],
      [/确认他们投票时的.*位置/, "确认投票时每个人站位"],
      [/将部分多余的武器藏在/, "把多余武器藏到出口附近"],
      [/列出几条无法反驳的物理证据/, "列出物理证据压卡尔"],
      [/直接回骂.*只想活着出去/, "回骂道德绑架的人"],
      [/不会为自己的清白做辩解/, "讽刺说若是狼你们早死了"],
      [/展示如何用绳子从高处速降/, "当众示范绳降逃生"],
      [/警告她.*等下别死了/, "警告派翠克别轻信别人"],
      [/制造一小片湿滑区域/, "在正门前做湿滑陷阱"],
      [/她投给了她认定是凶手的卡尔/, "毫不犹豫投卡尔"],
      [/她也考虑过弃权.*最终还是投了/, "犹豫过后仍然站队投票"],
      [/一把抓住狄波拉.*我知道密道/, "抓住狄波拉带她走密道"],
      [/冲向A21.*紧急逃生口/, "按预定路线冲向逃生口"],
      [/主动提出留下断后/, "靠陷阱自愿断后"],
      [/三轮车堵住门口.*扔出雷管/, "堵门后朝怪物扔雷管"],
      [/对讲机都调到最大音量扔出去/, "丢满音量对讲机引怪"],
      [/解开了自己之前设下的某个陷阱/, "解掉自己的陷阱开路"],
      [/将手中的武器砸向派翠克/, "把武器砸向派翠克断后"],
      [/转向A21的紧急逃生出口/, "转去A21紧急出口"],
    ];
    for (const [pattern, value] of tokenMap) {
      if (pattern.test(clean)) return ensureSecondPersonChoice(value);
    }
    return ensureSecondPersonChoice(clean);
  }

  function inferMemoryHooks(clean, tags, targets, location) {
    const hooks = [];
    if (location?.code) hooks.push(`visit:${location.code}`);
    targets.forEach((target) => hooks.push(`target:${target}`));
    if (tags.includes("generator")) hooks.push("system:generator");
    if (tags.includes("vote")) hooks.push("system:vote");
    if (tags.includes("rest")) hooks.push("inner:rest");
    if (/偷听|监听|窃听/.test(clean)) hooks.push("memory:eavesdrop");
    if (/跟踪|尾随/.test(clean)) hooks.push("memory:track");
    return hooks;
  }

  function inferProseHooks(clean, tags, targets, location) {
    const hooks = [];
    if (tags.includes("social")) hooks.push("prose:encounter");
    if (tags.includes("investigate")) hooks.push("prose:scene");
    if (tags.includes("rest")) hooks.push("prose:rest");
    if (tags.includes("attack")) hooks.push("prose:conflict");
    if (targets.includes("patrick")) hooks.push("prose:patrick");
    if (targets.includes("karl")) hooks.push("prose:karl");
    if (targets.includes("meruru")) hooks.push("prose:meruru");
    if (location?.code) hooks.push(`prose:room:${location.code}`);
    if (/投票|处刑/.test(clean)) hooks.push("prose:verdict");
    return hooks;
  }

  function inferNarrativeMotifs(clean, tags, targets, location, slotId) {
    const motifs = [];
    if (/对讲机|广播|通话/.test(clean)) motifs.push("broadcast");
    if (/祈祷|祷告|圣经|告解|赦免|主祷文|安魂/.test(clean)) motifs.push("prayer");
    if (/安慰|祝福|按手|拥抱|关怀|照顾|跟着我|别怕/.test(clean)) motifs.push("care");
    if (/观察|偷听|监听|监控|余光|打分|跟踪|埋伏|位置|视野/.test(clean)) motifs.push("surveillance");
    if (/开锁|喷雾|工具|撬|武器|铁棍|雷管|绳子|钉|匕首|陷阱/.test(clean)) motifs.push("weapon");
    if (/发电机|电闸|电源|密码|开门|闸门/.test(clean)) motifs.push("generator");
    if (/壁画|隐喻|黑山羊|拉丁文|藏书|书籍|抄本|仪式|圣物|灵魂|通灵|占卜/.test(clean)) motifs.push("ritual");
    if (/尸体|死讯|凶器|案发|血|焚烧炉|焚烧房/.test(clean) || slotId === "3.1" || slotId === "3.2" || slotId === "3.3") motifs.push("corpse");
    if (/天空|户外|正门|白门|湖边|异象|雾/.test(clean) || ["D3", "D5", "D6"].includes(location?.code)) motifs.push("sky");
    if (/投票|辩论|处刑|弃权|票/.test(clean)) motifs.push("vote");
    if (/结盟|同盟|交换|套近乎|交易|情报网络|暂时结成/.test(clean)) motifs.push("alliance");
    if (/隐瞒|藏|假装|人设|面具|礼貌|伪装|怯生生/.test(clean)) motifs.push("concealment");
    if (/指控|质问|挑战|警告|威逼|演说|主导叙事|回骂/.test(clean)) motifs.push("pressure");
    if (/救护车|车库|路线|逃跑|逃生口|密道|速降/.test(clean)) motifs.push("escape");
    if (/献祭|受死|断后|同归于尽|噩梦的一部分|挡住|留下/.test(clean)) motifs.push("sacrifice");
    if (tags.includes("rest")) motifs.push("rest");
    return [...new Set(motifs)];
  }

  function analyzeChoice(label, optionKey, slotId) {
    const clean = String(label).replace(/\*\*【休息】\*\*/g, "【休息】").trim();
    const location = findLocation(clean, slotId);
    const targets = findTargets(clean);
    const tags = deriveTags(clean, optionKey);
    const lowerRiskWords = ["安慰", "祝福", "祈祷", "休息", "冥想", "告解", "交谈", "劝告", "安抚"];
    const highRiskWords = ["攻击", "炸", "破坏", "断后", "挡住", "自伤", "献祭", "对视", "逼迫", "指控", "开枪"];
    const risk = highRiskWords.reduce((sum, word) => sum + (clean.includes(word) ? 2 : 0), 0) + (targets.length ? 1 : 0);
    const calm = lowerRiskWords.reduce((sum, word) => sum + (clean.includes(word) ? 1 : 0), 0);
    return {
      clean,
      slotId,
      optionKey,
      tags,
      targets,
      location,
      risk,
      calm,
      voteTarget: inferVoteTarget(clean),
      branchClass: classifyBranch(tags, clean, slotId),
      urgency: inferUrgency(tags, clean, slotId),
    };
  }

  function findTargets(text) {
    return Object.entries(ENTITIES)
      .filter(([id, entity]) => text.includes(entity.short) || text.includes(entity.name))
      .map(([id]) => id);
  }

  function findLocation(text, slotId) {
    const codeMatch = text.match(/([ABCD]\d{1,2})/);
    if (codeMatch) {
      const glossaryMatch = LOCATION_GLOSSARY.find((item) => item.code === codeMatch[1]);
      return glossaryMatch || { code: codeMatch[1], name: SLOT_META[slotId].location, mood: "霉味、金属与过度安静的压迫" };
    }
    const glossaryMatch = LOCATION_GLOSSARY.find((item) => text.includes(item.name));
    if (glossaryMatch) return glossaryMatch;
    const slot = SLOT_META[slotId];
    return { code: slot.locationCode, name: slot.location, mood: "被灯光压白的空气与迟迟不散的消毒水味" };
  }

  function inferVoteTarget(text) {
    if (text.includes("自己")) return "self";
    if (text.includes("卡尔")) return "karl";
    if (text.includes("派翠克")) return "patrick";
    if (text.includes("弃权")) return "abstain";
    return null;
  }

  function getOccupantsAtPosition(draftState, position, exclude = []) {
    if (!position) return [];
    const excluded = new Set(exclude);
    return Object.entries(draftState.npcPositions || {})
      .filter(([id, pos]) => pos === position && !excluded.has(id))
      .map(([id]) => id);
  }

  function rankEncounterCandidates(roleId, slotId, intent, draftState, candidates) {
    return [...candidates].sort((a, b) => scoreEncounterCandidate(roleId, slotId, intent, draftState, b) - scoreEncounterCandidate(roleId, slotId, intent, draftState, a));
  }

  function scoreEncounterCandidate(roleId, slotId, intent, draftState, candidateId) {
    let score = 0;
    if (!candidateId) return score;
    if (intent.targets.includes(candidateId)) score += 40;
    if (intent.tags.includes("protect") && candidateId === "emily") score += 24;
    if (intent.tags.includes("generator") && candidateId === "karl") score += 12;
    if (intent.tags.includes("social")) score += 6;
    if (intent.tags.includes("attack") && candidateId === "karl") score += 10;
    if (slotId === STORY_ANCHORS.secondGather && candidateId === "meruru") score += 16;
    if (slotId === STORY_ANCHORS.meruruDeath && candidateId === "karl") score += 20;
    if (slotId === STORY_ANCHORS.patrickAwakening && candidateId === "patrick") score += 30;
    if (slotId.startsWith("4.") && intent.voteTarget === candidateId) score += 24;
    score += Math.max(0, (draftState.relations[candidateId] || 0) / 4);
    score += Math.max(0, (draftState.suspicion?.player?.[candidateId] || 0) / 8);
    return score;
  }

  function chooseEncounter(roleId, slotId, intent, draftState) {
    const explicit = intent.targets.filter((target) => target !== roleId);
    if (explicit.length) return explicit[0];
    const localOccupants = rankEncounterCandidates(roleId, slotId, intent, draftState, getOccupantsAtPosition(draftState, intent.location?.code, [roleId]));
    if (localOccupants.length) return localOccupants[0];
    if (slotId === "1.1") return "meruru";
    if (slotId === STORY_ANCHORS.firstGather) return roleId === "anjie" ? "patrick" : roleId === "yamada" ? "emily" : "karl";
    if (slotId === "2.2") return "meruru";
    if (slotId === STORY_ANCHORS.secondGather) return roleId === "patrick" ? "anjie" : roleId === "yamada" ? "emily" : "karl";
    if (slotId === STORY_ANCHORS.meruruDeath) return "karl";
    if (slotId === "3.4") return roleId === "anjie" ? "patrick" : roleId === "patrick" ? "anjie" : "emily";
    if (slotId.startsWith("4.")) {
      if (intent.voteTarget === "karl") return "karl";
      if (intent.voteTarget === "patrick") return "patrick";
      return roleId === "yamada" ? "emily" : "karl";
    }
    if (slotId === STORY_ANCHORS.patrickAwakening) return "patrick";
    if (slotId === "5.2") return draftState.relations.emily > 8 ? "emily" : draftState.relations.patrick > 8 ? "patrick" : "karl";
    if (slotId === "5.3") return roleId === "yamada" ? "emily" : roleId === "anjie" ? "patrick" : "karl";
    if (slotId === "5.4") return "patrick";
    if (intent.tags.includes("protect")) return "emily";
    if (intent.tags.includes("social")) return "karl";
    return localOccupants[0] || "meruru";
  }

  function buildEffects(roleId, slotId, intent, draftState, encounterId) {
    const effects = {
      stats: { hp: 0, mp: 0, san: 0, fatigue: 0, truth: 0, exposure: 0, alertness: 0 },
      generatorGain: 0,
      addWords: [],
      addClues: [],
      addItems: [],
      relations: {},
      suspicion: [],
      flags: {},
      keyChoices: {},
      alliances: {},
      positions: {},
      notes: [],
    };

    if (intent.tags.includes("rest")) {
      effects.stats.mp += 1;
      effects.stats.san += 2;
      effects.stats.fatigue -= 1;
      effects.stats.alertness += 2;
      effects.notes.push("你把这十五分钟留给自己，也因此错过了别处更早开始的异动。");
    }

    if (intent.tags.includes("investigate")) {
      effects.stats.truth += 1;
      effects.stats.fatigue += 1;
    }

    if (intent.tags.includes("occult")) {
      effects.stats.truth += 2;
      effects.stats.mp -= 2;
      effects.stats.san -= 3;
    }

    if (intent.tags.includes("social")) {
      const target = encounterId;
      if (target) effects.relations[target] = (effects.relations[target] || 0) + 8 + intent.calm;
      effects.stats.exposure += intent.tags.includes("public") ? 4 : 1;
      if (target) effects.suspicion.push({ observer: target, subject: "player", delta: intent.tags.includes("public") ? 8 : 3 });
    }

    if (intent.tags.includes("attack")) {
      const target = encounterId;
      effects.stats.hp -= intent.tags.includes("selfHarm") ? 2 : 1;
      effects.stats.san -= 2;
      effects.stats.exposure += 8;
      effects.stats.alertness += 8;
      if (target) effects.relations[target] = (effects.relations[target] || 0) - 16;
      if (target === "karl") effects.flags.karlExposed = (draftState.flags.karlExposed || 0) + 1;
      if (target) effects.suspicion.push({ observer: target, subject: "player", delta: 14 });
    }

    if (intent.tags.includes("protect")) {
      if (encounterId) effects.relations[encounterId] = (effects.relations[encounterId] || 0) + 10;
      effects.stats.truth += 1;
      if (encounterId === "emily") effects.flags.emilyProtected = true;
      if (encounterId === "patrick") effects.flags.patrickBond = true;
      if (encounterId) effects.alliances[encounterId] = draftState.relations[encounterId] >= 16 ? "deep_trust" : "allied";
    }

    if (intent.tags.includes("public") && !intent.tags.includes("social")) {
      effects.stats.exposure += 5;
      effects.stats.alertness += 3;
    }

    if (intent.tags.includes("generator") && draftState.generators.progress < 4) {
      effects.generatorGain = 1;
      effects.stats.truth += 1;
      effects.stats.fatigue += 1;
      effects.stats.alertness += 1;
      effects.addWords.push(PASSWORD_WORDS[draftState.generators.progress]);
    }

    if (encounterId === "meruru" && (intent.tags.includes("social") || intent.tags.includes("protect"))) {
      effects.flags.meruruBlessing = true;
    }
    if (encounterId === "patrick" && (intent.tags.includes("social") || intent.tags.includes("protect"))) {
      effects.flags.patrickBond = true;
      effects.relations.patrick = (effects.relations.patrick || 0) + 6;
    }
    if (encounterId === "karl" && /指控|警告|辩护|质问|挑战/.test(intent.clean)) {
      effects.flags.karlExposed = (draftState.flags.karlExposed || 0) + 1;
      effects.relations.karl = (effects.relations.karl || 0) - 8;
    }
    if (encounterId === "emily" && /安慰|保护|照顾|守护/.test(intent.clean)) {
      effects.flags.emilyProtected = true;
      effects.relations.emily = (effects.relations.emily || 0) + 10;
    }

    const clueCandidates = [
      { pattern: /戒指/, clue: "狼群戒指" },
      { pattern: /日记/, clue: "露西日记残页" },
      { pattern: /眼球/, clue: "血丝眼球" },
      { pattern: /手链|红绳/, clue: "红绳手链" },
      { pattern: /病历|医疗报告/, clue: "布莱克病历" },
      { pattern: /遗言/, clue: "艾德莉遗言" },
      { pattern: /匕首/, clue: "活化匕首" },
      { pattern: /焚烧房|焚化炉/, clue: "焚烧房焦痕" },
      { pattern: /藏书馆|书籍|抄本/, clue: "母神抄本摘记" },
      { pattern: /实验室|白骨/, clue: "实验室白骨记录" },
      { pattern: /监控/, clue: "残损监控记录" },
      { pattern: /院长办公室/, clue: "布莱克伍德文稿" },
    ];

    clueCandidates.forEach((item) => {
      if (item.pattern.test(intent.clean)) effects.addClues.push(item.clue);
    });

    if (/对讲机/.test(intent.clean)) effects.addItems.push("对讲机");
    if (/眼球/.test(intent.clean)) effects.addItems.push("眼球");
    if (/戒指/.test(intent.clean)) effects.addItems.push("狼群戒指");
    if (/匕首/.test(intent.clean)) effects.addItems.push("活化匕首");

    if (slotId === "2.4") {
      effects.stats.truth += 1;
      effects.notes.push("这次集体分享让所有人的说辞第一次被摆在同一盏灯下。");
    }
    if (slotId === STORY_ANCHORS.meruruDeath) {
      effects.flags.meruruDead = true;
      effects.addClues.push("梅露露之死");
      effects.stats.alertness += 10;
      effects.positions.meruru = "B2";
      effects.positions.karl = "B2";
      effects.suspicion.push({ observer: "player", subject: "karl", delta: 18 });
      if (draftState.flags.meruruBlessing) effects.addClues.push("梅露露临终碎语");
    }
    if (slotId === "3.2" || slotId === STORY_ANCHORS.meruruDeath) {
      effects.stats.truth += 1;
      effects.addClues.push("户外紫灰天空");
    }
    if (slotId === "4.4") {
      effects.stats.alertness += 12;
      effects.flags.voteTarget = intent.voteTarget || "crowd";
      effects.keyChoices.vote_target = intent.voteTarget || "crowd";
    }
    if (slotId === "5.1") {
      effects.flags.patrickAwakened = true;
      effects.stats.alertness += 20;
      effects.stats.san -= roleId === "patrick" ? 6 : 8;
      if (draftState.relations.patrick >= 16 || draftState.flags.patrickBond) {
        effects.flags.patrickMercy = true;
      }
    }
    if (slotId === "5.4") {
      effects.flags.gateReady = draftState.generators.progress + effects.generatorGain >= 4;
      effects.keyChoices.final_choice = /断后|留下|成为噩梦|挡住/.test(intent.clean) ? "sacrifice" : "escape";
    }

    if (roleId === "fan" && /祈祷|赦免|告解/.test(intent.clean)) {
      effects.stats.truth += 1;
      effects.stats.san -= 1;
    }
    if (roleId === "ziche" && /武器|铁棍|陷阱|雷管|堵住/.test(intent.clean)) {
      effects.stats.hp -= 0;
      effects.stats.truth += 1;
      effects.stats.alertness += 2;
    }
    if (roleId === "yamada" && /艾米莉|姐姐|安抚/.test(intent.clean)) {
      effects.flags.emilyProtected = true;
      effects.relations.emily = (effects.relations.emily || 0) + 8;
    }
    if (roleId === "anjie" && /记录|推理|思维导图|结盟|情报/.test(intent.clean)) {
      effects.stats.truth += 1;
      effects.stats.mp -= 1;
    }
    if (roleId === "debora" && /爆破|燃烧瓶|消防|专业/.test(intent.clean)) {
      effects.stats.truth += 1;
      effects.stats.exposure += 4;
      effects.addClues.push("爆破装置判断");
    }
    if (roleId === "patrick" && /通灵|占卜|匕首|灵魂/.test(intent.clean)) {
      effects.stats.truth += 1;
      effects.stats.mp -= 1;
      effects.stats.san -= 1;
    }

    effects.positions.player = intent.location?.code || draftState.playerPosition;
    if (encounterId && effects.positions.player) effects.positions[encounterId] = effects.positions.player;

    return effects;
  }

  function applyEffectsToState(draftState, effects, scene) {
    draftState.stats.hp = clamp(draftState.stats.hp + effects.stats.hp, 0, draftState.maxStats.hp);
    draftState.stats.mp = clamp(draftState.stats.mp + effects.stats.mp, 0, draftState.maxStats.mp);
    draftState.stats.san = clamp(draftState.stats.san + effects.stats.san, 0, 99);
    draftState.stats.fatigue = clamp(draftState.stats.fatigue + effects.stats.fatigue, 0, 10);
    draftState.stats.truth = clamp(draftState.stats.truth + effects.stats.truth, 0, 9);
    draftState.stats.exposure = clamp(draftState.stats.exposure + effects.stats.exposure, 0, 100);
    draftState.stats.alertness = clamp(draftState.stats.alertness + effects.stats.alertness, 0, 100);

    if (effects.generatorGain > 0) {
      draftState.generators.progress = clamp(draftState.generators.progress + effects.generatorGain, 0, 4);
      effects.addWords.forEach((word) => {
        if (!draftState.generators.words.includes(word)) draftState.generators.words.push(word);
      });
    }

    effects.addClues.forEach((clue) => {
      if (!draftState.clues.includes(clue)) draftState.clues.push(clue);
    });

    effects.addItems.forEach((item) => {
      if (!draftState.items.includes(item)) draftState.items.push(item);
    });

    Object.entries(effects.relations).forEach(([key, delta]) => {
      draftState.relations[key] = clamp((draftState.relations[key] || 0) + delta, -100, 100);
    });

    effects.suspicion.forEach(({ observer, subject, delta }) => {
      draftState.suspicion[observer][subject] = clamp((draftState.suspicion?.[observer]?.[subject] || 0) + delta, 0, 100);
    });

    Object.entries(effects.flags).forEach(([key, value]) => {
      if (typeof value === "number") {
        draftState.flags[key] = value;
      } else if (value === true) {
        draftState.flags[key] = true;
      } else if (value) {
        draftState.flags[key] = value;
      }
    });

    Object.assign(draftState.keyChoices, effects.keyChoices);
    Object.assign(draftState.alliances, effects.alliances);
    Object.entries(effects.positions).forEach(([key, position]) => {
      if (key === "player") {
        draftState.playerPosition = position;
      } else {
        draftState.npcPositions[key] = position;
      }
    });

    const visitKey = scene.location.code || scene.location.name;
    draftState.visits[visitKey] = (draftState.visits[visitKey] || 0) + 1;
    draftState.flags.truthSeen = Math.max(draftState.flags.truthSeen || 0, draftState.stats.truth);
    draftState.flags.gateReady = draftState.generators.progress >= 4 || draftState.flags.gateReady;
    draftState.npcPositions = advanceNpcPositions(draftState, scene.slotId, visitKey);
  }

  function advanceNpcPositions(draftState, slotId, visitKey) {
    const currentIndex = SLOT_ORDER.indexOf(slotId);
    const nextSlotId = SLOT_ORDER[Math.min(currentIndex + 1, SLOT_ORDER.length - 1)];
    const nextPositions = normalizeNpcPositions(draftState.npcPositions, nextSlotId, draftState.selectedRole, draftState.playerPosition);
    if (draftState.flags.meruruDead) nextPositions.meruru = "B2";
    if (draftState.flags.patrickAwakened) nextPositions.patrick = nextSlotId.startsWith("5.") ? "D3" : nextPositions.patrick;
    if (visitKey === "A19" && nextPositions.meruru === "A19") nextPositions.meruru = "A20";
    return nextPositions;
  }

  function composeScene(slotId, optionKey) {
    const role = currentRole();
    const slot = SLOT_META[slotId];
    const label = getRoleOptions(role.id, slotId)[optionKey];
    const module = getOptionModule(role.id, slotId, optionKey);
    const intent = analyzeChoice(label, optionKey, slotId);
    if (module) {
      intent.branchClass = module.branchClass;
      intent.urgency = module.urgency;
      intent.focus = module.focus;
      intent.memoryHooks = module.memoryHooks;
      intent.proseHooks = module.proseHooks;
    }
    const draftState = structuredClone(state);
    const encounterId = chooseEncounter(role.id, slotId, intent, draftState);
    const encounter = ENTITIES[encounterId];
    const location = intent.location;
    const visitKey = location.code || location.name;
    const visitCount = draftState.visits[visitKey] || 0;
    const effects = buildEffects(role.id, slotId, intent, draftState, encounterId);
    const anchorText = buildAnchorBeat(role.id, slotId, intent, encounterId, effects, draftState);
    let paragraphs = [
      buildOpeningParagraph(role.id, slotId, slot, location, visitCount, intent, module, draftState),
      buildEncounterParagraph(role.id, slotId, encounterId, location, intent, draftState, module),
      anchorText,
      buildOutcomeParagraph(role.id, slotId, encounterId, effects, intent, draftState, module),
      buildRippleParagraph(role.id, slotId, encounterId, effects, intent, draftState, module),
      buildModuleContextParagraph(role.id, { module, slotId, intent, encounterId }, draftState),
    ].filter(Boolean);
    let quote = buildQuote(role.id, encounterId, intent, slotId);
    if (role.id === "patrick") {
      paragraphs = trimPatrickParagraphs(paragraphs);
      quote = splitPatrickParagraphText(quote, 120)[0] || normalizeNarrativeText(quote);
    } else if (role.id === "anjie") {
      paragraphs = trimAnjieParagraphs(paragraphs);
      quote = splitRouteParagraphText(quote, 120)[0] || normalizeNarrativeText(quote);
    } else if (PAGED_ROUTE_IDS.has(role.id)) {
      paragraphs = trimRouteParagraphs(paragraphs, getRouteParagraphLimit(role.id));
      quote = splitRouteParagraphText(quote, 120)[0] || normalizeNarrativeText(quote);
    }
    paragraphs = dedupeParagraphList(paragraphs);
    const effectChips = buildEffectChips(effects);
    const shortLabel = compactDecisionLabel(role.id, slotId, label);
    const summary = `${slotId} · ${shortLabel}`;
    const nextNotice = buildNextNotice(role.id, slotId, encounterId, effects, intent);
    return {
      slotId,
      slot,
      optionKey,
      module,
      optionLabel: label,
      cleanLabel: shortLabel,
      location,
      encounter,
      paragraphs,
      quote,
      effectChips,
      summary,
      nextNotice,
      effects,
    };
  }

  function stripRestLabel(label) {
    return String(label)
      .replace(/\*\*【休息】\*\*/g, "【休息】")
      .replace(/\*\*/g, "")
      .trim();
  }

  function ensureSecondPersonChoice(text) {
    const value = normalizeNarrativeText(text);
    if (!value) return "";
    if (value.startsWith("你") || value.startsWith("【") || value.startsWith("（") || value.startsWith("(")) return value;
    return `你${value}`;
  }

  function getRoleActionDetail(roleId, intent) {
    const source =
      roleId === "anjie"
        ? ANJIE_ACTION_DETAILS
        : roleId === "patrick"
          ? PATRICK_ACTION_DETAILS
          : GENERIC_ROLE_ACTION_DETAILS[roleId] || [];
    return source.find((item) => item.pattern.test(intent.clean)) || null;
  }

  function getRoleSlotBase(roleId, slotId) {
    if (roleId === "anjie") return ANJIE_SLOT_BASE[slotId] || "";
    if (roleId === "patrick") return PATRICK_SLOT_BASE[slotId] || "";
    return GENERIC_ROLE_SLOT_BASES[roleId]?.[slotId] || "";
  }

  function describeSceneVisit(roleId, location, visitCount) {
    if (visitCount > 1) {
      return roleId === "patrick"
        ? `你第${visitCount + 1}次回到${location.name}，回声更熟了。`
        : `你第${visitCount + 1}次回到${location.name}，旧脚步和失误更难忽视。`;
    }
    if (visitCount > 0) {
      return roleId === "patrick"
        ? `你再次回到${location.name}，这里的气息更沉。`
        : `你再次靠近${location.name}，这地方已经像一份有缺口的笔录。`;
    }
    return roleId === "patrick"
      ? `你朝${location.name}走去，先听见一阵回声。`
      : `你朝${location.name}走去，像在把假设推进现场。`;
  }

  function buildRoleFindingSentence(roleId, effects, slotId = "") {
    const stage = String(slotId || "")[0] || "1";
    if (effects.addClues.length) {
      if (roleId === "patrick") {
        return `你带回${effects.addClues.join("、")}，顺手记下它们的死气。`;
      }
      return `你把${effects.addClues.join("、")}直接记进证物序列，连来源和可信度都一并压上去。`;
    }
    if (roleId === "patrick") {
      if (stage === "1") return "你没拿到铁证，只多听见几层回声。";
      if (stage === "2") return "你还没摸到答案，只先记住回声偏向哪边。";
      if (stage === "3") return "你没握住实证，只先听清谁在对死亡说谎。";
      if (stage === "4") return "你还没拿到定论，只先看见谁开始对不上口供。";
      return "你暂时没抓住真相，只把最后几处回声钉稳了。";
    }
    if (roleId === "debora") {
      if (stage === "1") return "你没拿到结论，只先看清谁在装外行。";
      if (stage === "2") return "你还没抓住定论，只先记牢几处反常。";
      if (stage === "3") return "你没拿到答案，却先摸清哪段话最像遮掩。";
      if (stage === "4") return "你还没抓到实证，只先把几个人的心思摊平了。";
      return "你没把真相一把捞出来，只先认清谁会在最后失手。";
    }
    if (roleId === "yamada") {
      if (stage === "1") return "你还没有定论，但先记住了谁的表情先乱。";
      if (stage === "2") return "你还没拼出答案，只先把几处矛盾理进顺序。";
      if (stage === "3") return "你没有亮出判断，只把更关键的破绽收好了。";
      if (stage === "4") return "你还没把话说死，只先看清谁急着要你表态。";
      return "你没有交出结论，只先把最后的风险位置记牢。";
    }
    if (roleId === "fan") {
      if (stage === "1") return "你没有得到答案，只先看见谁在害怕。";
      if (stage === "2") return "你还没得到结论，只先确认哪里最像试炼。";
      if (stage === "3") return "你没有听到宽恕，只先分清谁在推罪。";
      if (stage === "4") return "你还没得到审判，只先听见几个人开始求生。";
      return "你没有等来神谕，只先知道代价会落在谁身上。";
    }
    if (roleId === "ziche") {
      if (stage === "1") return "你没拿到定论，先把能走的路和危险的人分开了。";
      if (stage === "2") return "你还没拿到答案，只先把工具、门和风险重排了一遍。";
      if (stage === "3") return "你没抓住结论，却先看清哪里会先炸开。";
      if (stage === "4") return "你还没定下判断，只先把谁会坏事算清了。";
      return "你没来得及求证全部，只先把最后几步活路卡住了。";
    }
    if (stage === "1") return "你还没有定论，但先把最初几处疑点记进了同一页。";
    if (stage === "2") return "你还没拼好答案，只先把新的冲突挪进时间线里。";
    if (stage === "3") return "你没有得到终局解释，却先抓到了更危险的缺口。";
    if (stage === "4") return "你还没把真相闭合，只先确认谁的说辞最先崩开。";
    return "你没有拿到完整结论，却已经逼近最后那几块拼图。";
  }

  function buildOutcomeTail(roleId, slotId) {
    if (roleId === "debora") {
      if (slotId === "1.1") return "规则刚讲完，你就知道这地方迟早会逼人露馅。";
      if (slotId === "1.2") return "大厅的第一轮试探结束后，你已经没法把所有人都当外行看。";
      if (slotId === "1.3") return "审讯室这种地方，最会把玩笑话慢慢养成真麻烦。";
      if (slotId === "1.4") return "越往下接触人，你越难继续装成只会慌张的大人。";
      if (slotId === "2.1") return "深处的发现不会自己散掉，之后多半还要回来找你。";
      if (slotId === "2.2") return "交换过一次态度，后面再圆场就没那么便宜了。";
      if (slotId === "2.3") return "和电闸有关的结果，迟早会在逃生上翻倍讨债。";
      if (slotId === "2.4") return "第二次聚集之后，谁还在演、谁开始急，已经很好看出来了。";
      if (slotId === "3.1") return "过了这一段，你已经很难再假装只是运气好。";
      if (slotId === "3.2") return "异界裂口一开，你那些装糊涂的台词就更站不住了。";
      if (slotId === "3.3") return "死人一出来，先前那些糊弄人的余地立刻就收紧了。";
      if (slotId === "3.4") return "临死告白这种东西，最容易把旧账也一起翻上来。";
      if (slotId === "4.1") return "卡尔一旦失手，票向就会跟着变。";
      if (slotId === "4.2") return "越靠近审判，你越难继续把锋芒藏进笑里。";
      if (slotId === "4.3") return "站到白门前，你得承认自己早已卷进局里。";
      if (slotId === "4.4") return "票一落下，你就不再只是旁观的人了。";
      if (slotId === "5.1") return "白门一亮起来，你那点打哈哈的余地就没了。";
      if (slotId === "5.2") return "到了收尾阶段，连退一步都像在给自己记账。";
      if (slotId === "5.3") return "最后几段路上，谁也不会再把你的笑话当成无害。";
      if (slotId === "5.4") return "到了最后，你还得把那点侥幸也一起吞回去。";
      return "一点判断，很快也会变成麻烦。";
    }
    if (roleId === "yamada") {
      if (slotId === "5.2" || slotId === "5.3") return "越接近结局，伪装越像债。";
      if (slotId === "4.4") return "到了投票时，面具也要跟着表态。";
      return "你知道这一步会改写后面的对话。";
    }
    if (roleId === "fan") {
      if (slotId === "5.4") return "到了白门前，连祈祷都像在替你追问代价。";
      if (slotId === "4.4") return "投票一落下去，宽恕就更难和纵容分开。";
      return "宽恕和审判更难分开。";
    }
    if (roleId === "ziche") {
      if (slotId === "5.4") return "白门只会给还抓得住节奏的人留路。";
      if (slotId === "4.4") return "投票之后，再慢一步都可能被人丢下。";
      return "只要还能抢到节奏，你就没被这地方吃掉。";
    }
    if (roleId === "patrick") {
      if (slotId === "5.2" || slotId === "5.3") return "你带回来的更多是一种压迫感。";
      if (slotId === "4.4") return "投票之后，人和回声都会站得更开。";
      return "你先把这份结果收住。";
    }
    return "";
  }

  function describeBranchClass(branchClass) {
    const labels = {
      rest: "休整",
      conflict: "冲突",
      system: "系统",
      encounter: "相遇",
      discovery: "发现",
      exploration: "探索",
      verdict: "审判",
      ending: "终局",
      anchor: "主干",
    };
    return labels[branchClass] || "事件";
  }

  function buildModuleContextParagraph(roleId, scene, draftState) {
    const module = scene.module;
    if (!module) return "";
    const branchText = buildBranchAftertaste(roleId, module, draftState);
    const hookText = buildHookAftertaste(roleId, module, scene, draftState);
    const memoryText = buildMemoryAftertaste(roleId, module, draftState);
    if (roleId === "yamada") {
      return buildYamadaRouteParagraph([branchText, hookText, memoryText]);
    }
    if (roleId === "debora" || roleId === "fan" || roleId === "ziche") {
      return "";
    }
    if (roleId === "patrick") {
      return buildPatrickCompactParagraph([branchText, hookText, memoryText], 190);
    }
    if (roleId === "anjie") {
      return buildRouteCompactParagraph([branchText, hookText, memoryText], 190);
    }
    return compactRouteParagraph(roleId, [branchText, hookText, memoryText], 190);
  }

  function buildBranchAftertaste(roleId, module, draftState) {
    const branch = module.branchClass;
    const fatigue = draftState.stats.fatigue;
    const motifText = buildMotifAftertaste(roleId, module, draftState, "branch");
    const urgencyText = module.urgency >= 4
      ? "你也知道，这不是可以慢慢拖延的小动作。它一旦被做出来，就会逼后面的局势提前表态。"
      : module.urgency <= 2
        ? "它看上去不像会立刻决定生死，偏偏正适合在后面的时段里慢慢发酵成更难处理的后果。"
        : "它暂时还没把全场推到临界点，却已经悄悄把几条后路改得和先前不一样了。";
    const focusText = module.focus
      ? `你甚至能感觉到，这一步的重心已经很明确地落在“${formatFocusLabel(module.focus).replace("：", " · ")}”上。`
      : "";
    const riskText =
      branch === "rest"
        ? "这段停顿看起来像给自己喘息，实际上更像把别处的脚步声先一步放大。"
        : branch === "conflict"
          ? "这一步把敌意拧得更紧，后面再见面时，连沉默都会带着刀口。"
          : branch === "verdict"
            ? "票纸的阴影已经提前罩了下来，接下来的每一次对视都开始像预先写好的供词。"
            : branch === "anchor"
              ? "这不是普通的移动，而是把下一轮主干事件推向另一种切面。"
              : "这一步没有当场定局，却已经悄悄改了后面几段相遇的口气。";
    const fatigueText = fatigue >= 4 ? "你的疲惫让这份回响更重了，连呼吸都像在替之后的选择记账。" : "";
    if (roleId === "fan") return `你把这一步看成一段试炼的余震。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`;
    if (roleId === "ziche") return `你只关心它改了哪些位置、哪些人和哪些筹码。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`;
    if (roleId === "yamada") return `这一步先替你换了一层面具。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`;
    if (roleId === "anjie") return `你会把这一步记成一个必须回查的节点。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`;
    if (roleId === "debora") return `你很清楚这种小动作最会长尾。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`;
    return roleId === "patrick"
      ? `你知道这一步已经留痕。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`
      : `你听见这一步在墙里留下了回声。${riskText}${urgencyText}${focusText}${fatigueText}${motifText}`;
  }

  function buildHookAftertaste(roleId, module, scene, draftState) {
    const hooks = new Set(module.proseHooks || []);
    const roomCode = Array.from(hooks).find((hook) => hook.startsWith("prose:room:"))?.slice("prose:room:".length) || module.location?.code || "";
    const roomLabel = roomCode ? describeRoomLabel(roomCode) : module.location?.name || "";
    const targetNames = (module.targets || []).map((id) => ENTITIES[id]?.short).filter(Boolean);
    const hookLines = [];
    if (hooks.has("prose:rest")) {
      hookLines.push(roleId === "patrick"
        ? "静下来以后，亡者的回声会更清楚。"
        : roleId === "ziche"
          ? "一旦停下来，你就会更清楚地听见远处的金属声和脚步。"
          : roleId === "anjie"
            ? "休息不是空白，只是给后续推理留一个能回头比对的空档。"
            : roleId === "debora"
              ? "你知道，越是说自己只是休息，越容易想起不该想起的东西。"
              : "你一慢下来，就更容易听见自己真正的心思。");
    }
    if (hooks.has("prose:encounter")) {
      hookLines.push(roleId === "yamada"
        ? "这类相遇会让你后面更难全身而退。"
        : roleId === "patrick"
          ? "和活人碰面后，你会先记住对方的气息有没有变。"
          : "每一次正面相遇都会把之后的站位、口气和票向先拧出一点形状。");
    }
    if (hooks.has("prose:scene")) {
      hookLines.push(roleId === "anjie"
        ? "你会把房间、痕迹和物件全都重新编号，因为真正会说话的从来不只是人。"
        : roleId === "ziche"
          ? "你更愿意把这地方当成一张可以拆解的地图，而不是一处单纯的怪谈现场。"
          : roleId === "patrick"
            ? "房间会先把痕迹交给你，再把答案拖到后面。"
            : "现场会留下比人更诚实的痕迹，灰尘、气味和破口都会替后面的剧情补证。");
    }
    if (hooks.has("prose:conflict")) {
      hookLines.push(roleId === "ziche"
        ? "冲突不是情绪问题，是距离和先手问题。"
        : roleId === "fan"
          ? "冲突一旦发生，赦免与惩罚就会被迫一起站上台面。"
          : "这类动作会让敌意长出形状，之后再遮掩就没那么容易了。");
    }
    if (hooks.has("prose:verdict")) {
      hookLines.push(roleId === "anjie"
        ? "投票不只是票数，它会把先前积下的怀疑一次性翻到账面上。"
        : roleId === "patrick"
          ? "到了这一步，沉默也会被算进票里。"
          : "票纸落下前，恐惧会先替每个人选好借口。");
    }
    if (hooks.has("prose:patrick")) {
      hookLines.push(roleId === "patrick"
        ? "你自己的名字也开始变重。"
        : "派翠克这个名字在之后会越来越沉。");
    }
    if (hooks.has("prose:karl")) {
      hookLines.push(roleId === "anjie"
        ? "卡尔每一次靠近都像把旧伤重新按亮。"
        : "卡尔的火气会继续烧，而且越烧越难收场。");
    }
    if (hooks.has("prose:meruru")) {
      hookLines.push(roleId === "patrick"
        ? "梅露露身上的光，你一时还忘不掉。"
        : "梅露露这个名字会继续挂在空气里。");
    }
    if (roomLabel) {
      hookLines.push(roleId === "debora"
        ? `${roomLabel}的气味会留到下一轮，让你一闻就知道自己来过。`
        : roleId === "ziche"
          ? `${roomLabel}说明你已经把这片区域摸熟了一点，后面再来就不容易被骗。`
          : roleId === "patrick"
            ? `${roomLabel}会把这一步的回声多留一阵。`
            : roleId === "yamada"
              ? `${roomLabel}会替这一步留下更长的余味。`
              : `${roomLabel}会把这一段动作留下痕迹。`);
    }
    if (targetNames.length) {
      hookLines.push(roleId === "yamada"
        ? `${targetNames.join("、")}的反应已经被你记住。`
        : roleId === "fan"
          ? `${targetNames.join("、")}的名字会在你心里继续回响，像一份尚未完成的代祷。`
          : roleId === "patrick"
            ? `${targetNames.join("、")}的气息，你之后还会认得出来。`
            : `${targetNames.join("、")}会把这次接触继续带进后面的时段里。`);
    }
    if (module.urgency >= 4) {
      hookLines.push(roleId === "ziche"
        ? "你知道这不是能慢慢观察到自然结束的动作，它会很快把人与人的节奏重新拧紧。"
        : roleId === "fan"
          ? "你隐约明白，这一步会比表面更快地向别人索取回应。"
          : roleId === "patrick"
            ? "这一步的后效来得很快，下一轮就会抬头。"
            : "这一步的后效来得很快。");
    }
    if (!hookLines.length) return "";
    return ` ${hookLines.join(" ")}`;
  }

  function buildMotifAftertaste(roleId, module, draftState, stage) {
    const motifs = new Set(module.motifs || []);
    const lines = [];
    if (motifs.has("broadcast")) {
      lines.push(roleId === "patrick"
        ? "广播会把未说尽的话逼成回音。"
        : "广播一响，别人的私语也会被迫长出重量。");
    }
    if (motifs.has("prayer")) {
      lines.push(roleId === "fan"
        ? "祷告不是停下来，而是把恐惧翻成另一种可以承受的语法。"
        : "这类念头会把空气里的沉默拉得更长。");
    }
    if (motifs.has("care")) {
      lines.push(roleId === "yamada"
        ? "照顾别人会让你更像无害的一边。"
        : "温柔说出口后，就会变成下注。");
    }
    if (motifs.has("surveillance")) {
      lines.push(roleId === "ziche"
        ? "你总会先看见别人没留神的背面。"
        : "注视本身就足够改变后面的站位。");
    }
    if (motifs.has("weapon")) {
      lines.push(roleId === "ziche"
        ? "武器在你眼里不是象征，是下一秒能不能活。"
        : "只要手里有器具，叙事就会更快走向现实。");
    }
    if (motifs.has("generator")) {
      lines.push(roleId === "anjie"
        ? "电路恢复时，逻辑就有了可被验证的支点。"
        : "发电机不是修理题，是争取时间的门闩。");
    }
    if (motifs.has("ritual")) {
      lines.push(roleId === "patrick"
        ? "仪式会把活人和亡者之间那层皮削薄。"
        : "这些字眼总会把简单的恐惧推向更深的层次。");
    }
    if (motifs.has("corpse")) {
      lines.push(roleId === "debora"
        ? "尸体会让每个人的表情都暴露出一点职业习惯。"
        : "死亡一旦被摆上台面，所有借口都会更像借口。");
    }
    if (motifs.has("sky")) {
      lines.push(roleId === "patrick"
        ? "那片天空会提醒你，外面也未必安全。"
        : "你抬头时，连方向感都得重新学。");
    }
    if (motifs.has("vote")) {
      lines.push(roleId === "anjie"
        ? "投票就是把态度写成不可撤回的记录。"
        : "票纸落下时，关系会先于结局裂开。");
    }
    if (motifs.has("alliance")) {
      lines.push(roleId === "yamada"
        ? "同盟看似柔软，实际上最会收网。"
        : "临时结盟往往只是更大的误判前奏。");
    }
    if (motifs.has("concealment")) {
      lines.push(roleId === "yamada"
        ? "伪装会帮你活下去，也会让你更难做自己。"
        : "藏起来的那部分，总会在关键时刻先出卖你。");
    }
    if (motifs.has("pressure")) {
      lines.push(roleId === "anjie"
        ? "压迫感会把每一句话都拧成证词。"
        : "逼迫一旦开始，退路就会变得很短。");
    }
    if (motifs.has("escape")) {
      lines.push(roleId === "ziche"
        ? "逃生路线不值钱，能跑通的才值钱。"
        : "真正重要的是门外还有没有下一口气。");
    }
    if (motifs.has("sacrifice")) {
      lines.push(roleId === "fan"
        ? "献祭这个词一旦出现，就再也不像抽象概念。"
        : "牺牲会把所有人都逼到更难看的位置。");
    }
    if (motifs.has("rest") && stage === "opening") {
      lines.push(roleId === "debora"
        ? "停下来时，旧伤最先醒。"
        : "安静本身也会留下痕迹。");
    }
    if (draftState.stats.truth >= 4) {
      lines.push(roleId === "anjie"
        ? "真相已经够多，接下来要看的只是它们如何互相咬合。"
        : "你已经离看清更近了一点，但也更难装作无知。");
    }
    return lines.length ? ` ${lines.join(" ")}` : "";
  }

  function buildMemoryAftertaste(roleId, module, draftState) {
    const hooks = module.memoryHooks || [];
    const memories = [];
    if (hooks.some((item) => item.startsWith("visit:"))) {
      const roomCode = hooks.find((item) => item.startsWith("visit:"))?.slice("visit:".length);
      if (roomCode) {
        memories.push(roleId === "anjie"
          ? `${describeRoomLabel(roomCode)}会在你的记录里多出一行标记。`
          : roleId === "patrick"
            ? `${describeRoomLabel(roomCode)}的回声会比别处留得更久。`
            : `${describeRoomLabel(roomCode)}会变成你之后路过时自动想起的地方。`);
      }
    }
    if (hooks.includes("system:generator")) {
      memories.push(roleId === "ziche"
        ? "发电机的嗡鸣让你更确定：只要电路还在，门就还有被撬开的可能。"
        : "发电机的声音会把后面几段追逐、停顿和广播都衬得更急。");
    }
    if (hooks.includes("system:vote")) {
      memories.push(roleId === "anjie"
        ? "投票这件事已经被你归档成了一条必须追责的线。"
        : "投票一旦被写进记忆，之后每一句辩解都会变得更硬。");
    }
    if (hooks.includes("inner:rest")) {
      memories.push(roleId === "debora"
        ? "休息时冒出来的不是安宁，而是你压住的旧账。"
        : "安静会放大你不想听见的部分。");
    }
    if (hooks.includes("memory:eavesdrop")) {
      memories.push("你会记得那次偷听，哪怕只记得半句，也足够在后面改写判断。");
    }
    if (hooks.includes("memory:track")) {
      memories.push(roleId === "ziche"
        ? "你已经开始习惯盯住别人走过的痕迹，而不是只看他们说了什么。"
        : "追踪留下的不是答案，而是更具体的怀疑。");
    }
    if (draftState.stats.fatigue >= 6) {
      memories.push(roleId === "patrick"
        ? "疲惫会让你更容易听见不该听见的呼吸。"
        : "你现在的疲惫太明显了，后面会更难遮掩。");
    }
    return memories.length ? ` ${memories.join(" ")}` : "";
  }

  function describeRoomLabel(code) {
    if (!code) return "";
    const item = LOCATION_GLOSSARY.find((entry) => entry.code === code);
    return item ? `${item.code}${item.name ? `·${item.name}` : ""}` : code;
  }

  function normalizeNarrativeText(text) {
    return `${text || ""}`.replace(/\s+/g, " ").trim();
  }

  function splitNarrativeSentences(text) {
    const normalized = normalizeNarrativeText(text);
    if (!normalized) return [];
    return normalized.match(/[^。！？；!?]+[。！？；!?]?/g)?.map((item) => item.trim()).filter(Boolean) || [normalized];
  }

  function buildSentenceSimilarityKey(text) {
    const normalized = normalizeNarrativeText(text).replace(/[。！？；!?，、：“”"'‘’《》〈〉（）()【】\s]/g, "");
    if (!normalized) return "";
    const compact = normalized
      .replace(/投票前夕|投票前夜|投票到了|投票阶段|投票之后/g, "投票")
      .replace(/白门前|站到白门前|到了白门前|越靠近白门/g, "白门")
      .replace(/不能再只当|已经不能只做|已经不能只当|不再只是|没法再只当/g, "不能只当")
      .replace(/打圆场的大人|替大家圆场的人|替大家挡话的人|看起来最会退让的人|旁观的人/g, "圆场人")
      .replace(/之后每次有人提起审判|这一步之后|白门一近|投票之后/g, "后续回响")
      .replace(/更容易被人回想起|就会跟着你往后拖|很难再把自己摘得干净|都会先想自己那句解释/g, "后续回响")
      .replace(/越难继续把锋芒收进笑里|越难分开求生和赎罪/g, "难再收住")
      .replace(/站到白门前你得承认自己也早被卷进局里了|站到白门前你得承认自己早被卷进局里了/g, "白门卷入");
    return compact;
  }

  function splitPatrickClauses(text) {
    const normalized = normalizeNarrativeText(text);
    if (!normalized) return [];
    return normalized.match(/[^，、：,:]+[，、：,:]?/g)?.map((item) => item.trim()).filter(Boolean) || [normalized];
  }

  function splitPatrickParagraphText(text, limit = PATRICK_PARAGRAPH_LIMIT) {
    const normalized = normalizeNarrativeText(text);
    if (!normalized) return [];
    const sentenceChunks = splitNarrativeSentences(normalized).flatMap((sentence) => {
      if (sentence.length <= limit) return [sentence];
      const clauses = splitPatrickClauses(sentence);
      if (clauses.length <= 1) {
        const hardChunks = [];
        for (let index = 0; index < sentence.length; index += limit) {
          hardChunks.push(sentence.slice(index, index + limit));
        }
        return hardChunks;
      }
      const pieces = [];
      let current = "";
      clauses.forEach((clause) => {
        if (!current) {
          current = clause;
          return;
        }
        if ((current + clause).length <= limit) {
          current += clause;
          return;
        }
        pieces.push(current);
        current = clause;
      });
      if (current) pieces.push(current);
      return pieces;
    });
    const paragraphs = [];
    let current = "";
    sentenceChunks.forEach((chunk) => {
      if (!current) {
        current = chunk;
        return;
      }
      if ((current + chunk).length <= limit) {
        current += chunk;
        return;
      }
      paragraphs.push(current);
      current = chunk;
    });
    if (current) paragraphs.push(current);
    return paragraphs.map((item) => normalizeNarrativeText(item)).filter(Boolean);
  }

  function splitRouteParagraphText(text, limit = ROUTE_PARAGRAPH_LIMIT) {
    return splitPatrickParagraphText(text, limit);
  }

  function buildRouteCompactParagraph(parts, limit = 220) {
    const compact = [];
    const seen = new Set();
    parts.forEach((part) => {
      splitRouteParagraphText(part, limit).forEach((chunk) => {
        const normalized = normalizeNarrativeText(chunk);
        if (!normalized || seen.has(normalized)) return;
        const merged = compact.join("") + normalized;
        if (merged.length <= limit || !compact.length) {
          compact.push(normalized);
          seen.add(normalized);
        }
      });
    });
    return normalizeNarrativeText(compact.join(""));
  }

  function dedupeParagraphList(paragraphs) {
    return (Array.isArray(paragraphs) ? paragraphs : [])
      .map((paragraph) => dedupeJoinedNarrative(paragraph))
      .filter(Boolean);
  }

  function compactRouteParagraph(roleId, parts, limit = ROUTE_PARAGRAPH_LIMIT) {
    const compact = buildRouteCompactParagraph(parts, limit);
    if (!compact) return "";
    if (roleId === "patrick") return compact;
    return compact.length > limit ? splitRouteParagraphText(compact, limit)[0] || compact : compact;
  }

  function buildLooseRouteParagraph(parts) {
    return normalizeNarrativeText(parts.filter(Boolean).join(" "));
  }

  function buildYamadaRouteParagraph(parts) {
    return normalizeNarrativeText(parts.filter(Boolean).join(" "));
  }

  function getRouteParagraphLimit(roleId) {
    return COMPACT_RESULT_ROUTE_IDS.has(roleId) ? 170 : ROUTE_PARAGRAPH_LIMIT;
  }

  function trimRouteParagraphs(paragraphs, limit = ROUTE_PARAGRAPH_LIMIT) {
    const result = [];
    const seen = new Set();
    paragraphs.forEach((paragraph) => {
      splitRouteParagraphText(paragraph, limit).forEach((chunk) => {
        const normalized = normalizeNarrativeText(chunk);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        result.push(normalized);
      });
    });
    return result.slice(0, 6);
  }

  function packResultPages(paragraphs, roleId = "") {
    const items = Array.isArray(paragraphs) ? paragraphs.map((paragraph) => normalizeNarrativeText(paragraph)).filter(Boolean) : [];
    if (!items.length) return [[]];
    if (items.length === 1) return [items];
    const lengths = items.map((paragraph) => paragraph.length);
    const total = lengths.reduce((sum, value) => sum + value, 0) + Math.max(0, items.length - 1) * 2;
    let splitIndex = 1;
    let bestGap = Infinity;
    let left = 0;
    for (let index = 1; index < items.length; index += 1) {
      left += lengths[index - 1];
      const leftTotal = left + Math.max(0, index - 1) * 2;
      const rightTotal = total - leftTotal - 2;
      const gap = Math.abs(leftTotal - rightTotal);
      if (gap < bestGap) {
        bestGap = gap;
        splitIndex = index;
      }
    }
    return [
      items.slice(0, splitIndex),
      items.slice(splitIndex),
    ].filter((page) => page.length);
  }

  function getRouteResultPages(scene, roleId = "") {
    const paragraphs = Array.isArray(scene?.paragraphs) ? scene.paragraphs.filter(Boolean) : [];
    return packResultPages(paragraphs, roleId);
  }

  function buildPatrickCompactParagraph(parts, limit = 220) {
    return buildRouteCompactParagraph(parts, limit);
  }

  function trimPatrickParagraphs(paragraphs) {
    const groupedParagraphs = paragraphs.length >= 6
      ? [
          paragraphs[0],
          paragraphs[1],
          `${paragraphs[2]}${paragraphs[3]}`,
          `${paragraphs[4]}${paragraphs[5]}`,
        ]
      : paragraphs;
    const result = [];
    const seen = new Set();
    groupedParagraphs.forEach((paragraph) => {
      splitPatrickParagraphText(paragraph, PATRICK_PARAGRAPH_LIMIT).forEach((chunk) => {
        const normalized = normalizeNarrativeText(chunk);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        result.push(normalized);
      });
    });
    return result.slice(0, 6);
  }

  function trimAnjieParagraphs(paragraphs) {
    return trimRouteParagraphs(paragraphs, ROUTE_PARAGRAPH_LIMIT);
  }

  function getPatrickResultPages(scene) {
    return getRouteResultPages(scene, "patrick");
  }

  function getAnjieResultPages(scene) {
    return getRouteResultPages(scene, "anjie");
  }

  function getPagedResultPages(scene, roleId = "") {
    return getRouteResultPages(scene, roleId);
  }

  function buildRestIntrospection(roleId, slotId, location, draftState) {
    const base = SLOT_STAKES[slotId]?.rest || "";
    const roomText = location?.name || "这里";
    if (roleId === "fan") {
      return `${base}你把手指抵在掌心，先确认疼痛还肯不肯替你作证。${roomText}里的寒意让你更清楚，这场试炼没有人会替你收尾。`;
    }
    if (roleId === "ziche") {
      return `${base}你没有真的放松，只是把动作降到最低。${roomText}的墙、门和回声都被你重新过了一遍，至少现在还有东西能用。`;
    }
    if (roleId === "yamada") {
      return `${base}你先确认笑意、呼吸和视线都还在安全线内。${roomText}越安静，你越清楚自己不能让脸先露出真相。`;
    }
    if (roleId === "anjie") {
      return `${base}你让笔尖短暂离开纸面，强迫自己先把呼吸调匀。可只要一闭眼，房间编号、人物站位、时间顺序和互相矛盾的证词就会自动在脑内重排。${roomText}没有给你真正的安全感，它只给了你一个更适合整理推理的空白页。你害怕的从来不只是怪异本身，而是有一天连逻辑都不再肯替你挡住恐惧。`;
    }
    if (roleId === "debora") {
      return `${base}你把肩膀往墙上一靠，先摆出一副快撑不住的样子。可没人盯着时，你脑子里先冒出来的还是旧现场和旧失误。`;
    }
    if (roleId === "patrick") {
      const lead = buildPatrickCompactParagraph([base], 100);
      return `${lead}你把呼吸放轻，先分清靠近的是风声、脚步，还是亡者。${roomText}越安静，越容易漏掉真正该记住的那一下动静。`;
    }
    return base;
  }

  function buildRoleModulePassage(roleId, slotId, stage, module, draftState, encounterId) {
    if (!module) return "";
    if (roleId === "anjie") return buildAnjieModulePassage(slotId, stage, module, draftState, encounterId);
    if (roleId === "patrick") return buildPatrickModulePassage(slotId, stage, module, draftState, encounterId);
    if (roleId === "yamada") return buildYamadaModulePassage(slotId, stage, module, draftState, encounterId);
    if (roleId === "debora") return buildDeboraModulePassage(slotId, stage, module, draftState, encounterId);
    if (roleId === "fan") return buildFanModulePassage(slotId, stage, module, draftState, encounterId);
    if (roleId === "ziche") return buildZicheModulePassage(slotId, stage, module, draftState, encounterId);
    return "";
  }

  function buildAnjieModulePassage(slotId, stage, module, draftState, encounterId) {
    const motifs = new Set(module.motifs || []);
    const target = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const room = module.location?.name || "这里";
    const lines = [];
    if (stage === "opening") {
      if (motifs.has("surveillance")) lines.push(`${room}里的每一次停顿都该被编号。谁先看谁、谁先移开视线、谁在话尾多吞了一次口水，这些都比空话更接近真相。`);
      if (motifs.has("generator")) lines.push(`发电机、门闩和密码让你安心，因为它们至少服从因果。你需要这种还能用步骤解释的东西。`);
      if (motifs.has("ritual")) lines.push(`仪式和隐喻会把证据边界磨掉。你必须亲自确认，它们到底只是障眼法，还是这栋楼真正的语言。`);
      if (motifs.has("concealment")) lines.push(`最让你警惕的不是动作本身，而是动作背后的留白。越像无害的东西，越值得多看一眼。`);
      if (motifs.has("alliance")) lines.push(`关系在这里不是附属变量。谁先靠近谁，都会在后面的票向里回头算账。`);
    }
    if (stage === "encounter") {
      if (motifs.has("care") && target) lines.push(`${target}递来的善意不能直接当真，但也不能浪费。你先看口气，再看他为什么偏偏在这时靠近。`);
      if (motifs.has("pressure") && target) lines.push(`你和${target}之间的空气会立刻变硬。最先开裂的往往不是逻辑，而是姿态。`);
      if (motifs.has("corpse") && target) lines.push(`只要谈到尸体、凶器或案发现场，${target}的惊慌会先于证词露出来。你盯的就是那一秒空白。`);
      if (motifs.has("vote") && target) lines.push(`你会在说话的同时想到票纸，因为这里的每次接触都在提前积累票向。`);
      if (motifs.has("prayer") && target) lines.push(`一旦对方拿祷词或神意解释现实，你的警惕就会上升。模糊语言最会替恐惧遮羞。`);
    }
    if (stage === "outcome") {
      if (motifs.has("surveillance")) lines.push(`这类收集不会立刻给你答案，却会替你省下之后回头核对的力气。`);
      if (motifs.has("generator")) lines.push(`机关、线路和密码一推进，你会暂时稳一点，因为至少还有一部分世界服从顺序。`);
      if (motifs.has("alliance")) lines.push(`最难处理的不是线索，而是关系被推动后留下的连锁反应。`);
      if (motifs.has("concealment")) lines.push(`你必须一边读别人的谎，一边决定自己该保留多少真话。`);
    }
    if (stage === "ripple") {
      if (motifs.has("vote")) lines.push(`之后只要再有人提起“该相信谁”，这一步就会被重新拽出来。票向早在接触时就开始写草稿。`);
      if (motifs.has("corpse")) lines.push(`死亡一旦进入时序，整条时间线都会变得更难清理。`);
      if (motifs.has("escape")) lines.push(`这一步哪怕只让你离出口近了一点，也已经改写了你对取舍的顺序。`);
    }
    lines.push(...buildAnjieSlotStageLines(slotId, stage, draftState, encounterId));
    lines.push(...buildAnjieAnchorOverlayLines(slotId, stage, draftState, encounterId));
    return lines.length ? ` ${lines.join(" ")}` : "";
  }

  function buildPatrickModulePassage(slotId, stage, module, draftState, encounterId) {
    const motifs = new Set(module.motifs || []);
    const target = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const room = module.location?.name || "这里";
    const lines = [];
    if (stage === "opening") {
      if (motifs.has("ritual")) lines.push(`${room}里还留着仪式痕迹。`);
      if (motifs.has("corpse")) lines.push("死气一冒出来，你就知道这里不干净。");
      if (motifs.has("sky")) lines.push("那片天一抬头就压下来。");
      if (motifs.has("generator")) lines.push("发电机的声调像悼词。");
      if (motifs.has("rest")) lines.push("你停下，是为了听清。");
    }
    if (stage === "encounter") {
      if (motifs.has("care") && target) lines.push(`你先看${target}有没有稳住。`);
      if (motifs.has("alliance") && target) lines.push("这更像暂时并肩。");
      if (motifs.has("pressure") && target) lines.push("一提处决，空气就闷。");
      if (motifs.has("corpse") && target) lines.push(`一谈死者，${target}身上的光就会变。`);
      if (motifs.has("concealment") && target) lines.push(`你知道${target}还留着一层没给人看。`);
    }
    if (stage === "outcome") {
      if (motifs.has("ritual")) lines.push("答案没来，低语先近了。");
      if (motifs.has("care")) lines.push("谁要是因你安静下来，你接住的就不只是信任。");
      if (motifs.has("sky")) lines.push("你带回来的更多是一种压迫感。");
      if (motifs.has("generator")) lines.push("门能开，不代表后果会轻。");
    }
    if (stage === "ripple") {
      if (motifs.has("corpse")) lines.push("死者离开视线，也不会安静。");
      if (motifs.has("alliance")) lines.push("你替谁停下，后面都会回来算账。");
      if (motifs.has("sacrifice")) lines.push("一碰到牺牲，后面的选择都会斜。");
    }
    const slotLines = buildPatrickSlotStageLines(slotId, stage, draftState, encounterId);
    const overlayLines = buildPatrickAnchorOverlayLines(slotId, stage, draftState, encounterId);
    const compact = buildPatrickCompactParagraph([...lines, ...slotLines, ...overlayLines], 220);
    return compact ? ` ${compact}` : "";
  }

  function buildYamadaModulePassage(slotId, stage, module, draftState, encounterId) {
    const motifs = new Set(module.motifs || []);
    const target = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const room = module.location?.name || "这里";
    const lines = [];
    if (stage === "opening") {
      if (motifs.has("concealment")) lines.push("你先挑最安全的那张脸。真话照例往后放。");
      if (motifs.has("alliance")) lines.push("只要牵扯同盟，你先算代价，再决定要不要靠近。");
      if (motifs.has("surveillance")) lines.push(`${room}越安静，你越容易看清谁在硬撑。`);
      if (motifs.has("care")) lines.push("一碰到艾米莉，你那张无害的脸就没平时那么稳。");
      if (motifs.has("rest")) lines.push("停下来时，你先检查表情和嗓音有没有漏底。");
    }
    if (stage === "encounter") {
      if (motifs.has("care") && target) lines.push(`一面对${target}，你就会把声音放轻一点，再赶紧收回去。`);
      if (motifs.has("concealment") && target) lines.push(`你和${target}说话时，一边装无害，一边试对方吃哪一套。`);
      if (motifs.has("pressure") && target) lines.push(`真要逼问时，你偏要用最轻的口气把${target}推到角落。`);
      if (motifs.has("alliance") && target) lines.push(`结盟对你来说更像暂借立场。借完总要还。`);
      if (motifs.has("surveillance") && target) lines.push(`比起${target}说了什么，你更记得那一下停顿。`);
    }
    if (stage === "outcome") {
      if (motifs.has("concealment")) lines.push("你暂时藏过去了，但这笔账只会往后拖。");
      if (motifs.has("care")) lines.push("最累的不是照顾人，是你又认真了一瞬。");
      if (motifs.has("alliance")) lines.push("这次结果会逼你重排谁能信、谁只能用。");
      if (motifs.has("corpse")) lines.push("一旦见血，你那张稳脸就要花更大力气撑住。");
    }
    if (stage === "ripple") {
      if (motifs.has("care")) lines.push("这份靠近很难再退回普通礼貌。");
      if (motifs.has("concealment")) lines.push("面具一换上，后面的动作也得跟着改。");
      if (motifs.has("alliance")) lines.push("同盟一出现，别人就会替你补完动机。");
    }
    lines.push(...buildYamadaSlotStageLines(slotId, stage, draftState, encounterId));
    lines.push(...buildYamadaAnchorOverlayLines(slotId, stage, draftState, encounterId));
    return lines.length ? ` ${buildYamadaRouteParagraph(lines)}` : "";
  }

  function buildDeboraModulePassage(slotId, stage, module, draftState, encounterId) {
    const motifs = new Set(module.motifs || []);
    const target = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const room = module.location?.name || "这里";
    const lines = [];
    if (stage === "opening") {
      if (motifs.has("concealment")) lines.push("你先把慌张摆出来。");
      if (motifs.has("weapon")) lines.push("可一碰到工具，你的手总会更快。");
      if (motifs.has("corpse")) lines.push(`${room}会逼你想起现场该先看哪。`);
      if (motifs.has("alliance")) lines.push("一谈合作，你先想谁会甩锅。");
      if (motifs.has("rest")) lines.push("你一停下来，旧现场就会往上冒。");
    }
    if (stage === "encounter") {
      if (motifs.has("care") && target) lines.push(`你先拿玩笑垫场，再看${target}愿不愿低估你。`);
      if (motifs.has("pressure") && target) lines.push(`你不用抬高声音，也能逼${target}露怯。`);
      if (motifs.has("corpse") && target) lines.push(`一谈死者，${target}就更容易看出你不外行。`);
      if (motifs.has("alliance") && target) lines.push(`你和${target}若同路，更像互借退路。`);
      if (motifs.has("concealment") && target) lines.push(`只要${target}先把你放进“没威胁”那栏，你就还有空间。`);
    }
    if (stage === "outcome") {
      if (motifs.has("weapon")) lines.push("和工具沾边，最容易露出真本事。");
      if (motifs.has("corpse")) lines.push("一碰到死人，你的旧经验就会跟着复活。");
      if (motifs.has("alliance")) lines.push("别人一旦开始靠你，你就更难继续只演没用的大人。");
      if (motifs.has("concealment")) lines.push("每次示弱都在记账。");
    }
    if (stage === "ripple") {
      if (motifs.has("corpse")) lines.push("之后你会在不相干的转角闻见并不存在的现场味。");
      if (motifs.has("alliance")) lines.push("只要你替谁兜过话，那份关系就会回来讨债。");
      if (motifs.has("escape")) lines.push("一认真盘算出口，你就得承认自己也在挑人。");
    }
    lines.push(...buildDeboraSlotStageLines(slotId, stage, draftState, encounterId));
    lines.push(...buildDeboraAnchorOverlayLines(slotId, stage, draftState, encounterId));
    return lines.length ? ` ${compactRouteParagraph("debora", lines, 96)}` : "";
  }

  function buildFanModulePassage(slotId, stage, module, draftState, encounterId) {
    const motifs = new Set(module.motifs || []);
    const target = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const lines = [];
    if (stage === "opening") {
      if (motifs.has("prayer")) lines.push("你先把这一步当成祷告，好让恐惧有个名字。");
      if (motifs.has("care")) lines.push("一靠近别人，你就会本能地想先替对方承担一点。");
      if (motifs.has("ritual")) lines.push("碰到仪式和圣物时，你总会先想到启示。");
      if (motifs.has("corpse")) lines.push("闻到死亡时，你先想到的不是案发，而是净化与罪。");
      if (motifs.has("sacrifice")) lines.push("只要选项里出现“留下”，受难的念头就会先抬头。");
    }
    if (stage === "encounter") {
      if (motifs.has("care") && target) lines.push(`靠近${target}时，你很难分清是在安抚，还是在试探。`);
      if (motifs.has("pressure") && target) lines.push(`${target}一谈到罪与忏悔，你就更想知道他怕的是什么。`);
      if (motifs.has("corpse") && target) lines.push(`死者让${target}更难维持体面，这时最容易露底。`);
      if (motifs.has("vote") && target) lines.push(`你会提前想到${target}最后会把票写向哪里。`);
      if (motifs.has("prayer") && target) lines.push(`若${target}也拿经文解释现实，你反而更警惕。`);
    }
    if (stage === "outcome") {
      if (motifs.has("prayer")) lines.push("带着祈祷意味的结果，很难只被你当成行动后果。");
      if (motifs.has("care")) lines.push("只要谁因你安静下来，你就会把那份痛一起背走。");
      if (motifs.has("ritual")) lines.push("和仪式沾边的收获，会逼你继续往更深处靠。");
      if (motifs.has("sacrifice")) lines.push("一旦牺牲被认真摆上桌，它就会缠住你后面的每次选择。");
    }
    if (stage === "ripple") {
      if (motifs.has("vote")) lines.push("从这里开始，审判会更早在对话里成形。");
      if (motifs.has("corpse")) lines.push("死亡的回声会在后来反复找上你。");
      if (motifs.has("sacrifice")) lines.push("你之后再看门和同伴时，都会更容易把“留下”算进去。");
    }
    lines.push(...buildFanSlotStageLines(slotId, stage, draftState, encounterId));
    return lines.length ? ` ${compactRouteParagraph("fan", lines, 104)}` : "";
  }

  function buildZicheModulePassage(slotId, stage, module, draftState, encounterId) {
    const motifs = new Set(module.motifs || []);
    const target = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const room = module.location?.name || "这里";
    const lines = [];
    if (stage === "opening") {
      if (motifs.has("surveillance")) lines.push(`你一进${room}，先拆视野和死角。`);
      if (motifs.has("weapon")) lines.push("只要有器具和机关，你先想怎么用。");
      if (motifs.has("generator")) lines.push("发电机和门闩会让你立刻开始算控制权。");
      if (motifs.has("corpse")) lines.push("一沾到血和尸体，你就先看落点和退路。");
      if (motifs.has("escape")) lines.push("一靠近出口，你就先把最坏情况想完。");
    }
    if (stage === "encounter") {
      if (motifs.has("pressure") && target) lines.push(`你和${target}对上时，先算谁先丢先手。`);
      if (motifs.has("alliance") && target) lines.push(`所谓结盟，在你眼里更像暂借${target}的火力和位置。`);
      if (motifs.has("corpse") && target) lines.push(`只要谈到现场，${target}一点迟疑都会被你放大。`);
      if (motifs.has("generator") && target) lines.push(`一扯到发电机和门闩，你就先判断${target}会不会抢控制权。`);
      if (motifs.has("escape") && target) lines.push(`一谈出口，你就更快把${target}按进取舍表。`);
    }
    if (stage === "outcome") {
      if (motifs.has("weapon")) lines.push("和工具有关的成果，会立刻变成你的备用答案。");
      if (motifs.has("generator")) lines.push("系统目标一推进，你最先想到的就是之后谁来争。");
      if (motifs.has("corpse")) lines.push("事情一沾死亡，你的判断就会更冷。");
      if (motifs.has("escape")) lines.push("只要出口有进展，你脑内路线图就得重画。");
    }
    if (stage === "ripple") {
      if (motifs.has("generator")) lines.push("这类系统进展不会停在当前时段里。");
      if (motifs.has("corpse")) lines.push("之后每个拐角都更像潜在现场。");
      if (motifs.has("escape")) lines.push("出口一旦可选，之后所有合作都会带上谁跟得上的算法。");
    }
    lines.push(...buildZicheSlotStageLines(slotId, stage, draftState, encounterId));
    return lines.length ? ` ${compactRouteParagraph("ziche", lines, 92)}` : "";
  }

  function buildModuleStageLine(roleId, module, draftState, stage, encounterId) {
    if (!module) return "";
    const hooks = new Set(module.proseHooks || []);
    const roomText = module.location?.code ? describeRoomLabel(module.location.code) : module.location?.name || "";
    const targetName = encounterId ? ENTITIES[encounterId]?.short || "" : "";
    const focusText = buildFocusEcho(roleId, module, roomText, targetName);
    const hookText = buildHookEcho(roleId, hooks, draftState, stage, targetName, roomText);
    const branchText = buildBranchEcho(roleId, module.branchClass, draftState, stage, targetName, roomText);
    const lines = [focusText, hookText, branchText].filter(Boolean);
    return lines.length ? ` ${lines.join(" ")}` : "";
  }

  function dedupeJoinedNarrative(text) {
    const normalized = normalizeNarrativeText(text);
    if (!normalized) return "";
    const pieces = normalized.split(/(?<=[。！？])/u).map((part) => part.trim()).filter(Boolean);
    const result = [];
    const seen = new Set();
    pieces.forEach((piece) => {
      const key = piece.replace(/\s+/g, "");
      const similarityKey = buildSentenceSimilarityKey(piece);
      if (seen.has(key) || (similarityKey && seen.has(similarityKey))) return;
      if ([...seen].some((prior) => key.includes(prior) || prior.includes(key) || (similarityKey && (similarityKey.includes(prior) || prior.includes(similarityKey))))) return;
      seen.add(key);
      if (similarityKey) seen.add(similarityKey);
      result.push(piece);
    });
    return result.join("");
  }

  function buildFocusEcho(roleId, module, roomText, targetName) {
    const focus = module.focus || "";
    const branchText =
      module.branchClass === "rest"
        ? "这是一个给自己留气口的时段。"
        : module.branchClass === "conflict"
          ? "这一步的核心不是到哪儿，而是把谁逼到边缘。"
          : module.branchClass === "verdict"
            ? "这一步会把前面的疑点重新折回人群中心。"
            : module.branchClass === "anchor"
              ? "这一步本身就会把主干事件往前推一格。"
              : "这一步会让局势出现新的面。";
    if (roleId === "fan") return `${branchText}${roomText ? ` ${roomText}会把试炼放得更近。` : ""}`;
    if (roleId === "ziche") return `${branchText}${roomText ? ` ${roomText}在你眼里就是可拆的地形。` : ""}`;
    if (roleId === "yamada") return `${branchText}${roomText ? ` ${roomText}会逼你换张更安全的脸。` : ""}`;
    if (roleId === "anjie") return `${branchText}${roomText ? ` ${roomText}足够让你继续校对假设。` : ""}`;
    if (roleId === "debora") return `${branchText}${roomText ? ` ${roomText}会让旧账先冒头。` : ""}`;
    return `${branchText}${roomText ? ` ${roomText}里有你能抓住的回声。` : ""}`;
  }

  function buildHookEcho(roleId, hooks, draftState, stage, targetName, roomText) {
    const lines = [];
    if (hooks.has("prose:rest") && stage === "opening") {
      lines.push(roleId === "patrick"
        ? "静下来以后，亡者的声音会先于活人的脚步找上你。"
        : roleId === "ziche"
          ? "你一停下来，就会开始听见别处的动静。"
          : roleId === "anjie"
            ? "休整不是停摆，只是把后续判断暂时压到更安静的地方。"
            : roleId === "debora"
              ? "你知道休息只会让某些记忆更有空隙钻出来。"
              : "你把呼吸放慢时，祷词和恐惧会一起浮上来。");
    }
    if (hooks.has("prose:encounter") && stage === "encounter") {
      lines.push(targetName
        ? `${targetName}会把这次碰面变成后面还要反复回看的节点。`
        : "这次正面碰面本身就会改变后面的对话方式。");
    }
    if (hooks.has("prose:scene") && stage === "opening") {
      lines.push(roleId === "anjie"
        ? "你会在这类地点先找证据，再找情绪。"
        : roleId === "ziche"
          ? "你会先找出这里能不能当成障碍物。"
          : "现场会先把细节交给你，再把答案交给后面的推理。");
    }
    if (hooks.has("prose:scene") && stage === "ripple") {
      lines.push(roleId === "debora"
        ? "现场残留的气味会把你拉回该记住的地方。"
        : "场景留下的细节会在后面再回头咬你一次。");
    }
    if (hooks.has("prose:conflict") && stage === "outcome") {
      lines.push(roleId === "ziche"
        ? "冲突只会继续抬高对方的警觉。"
        : "这类动作会把敌意从暗处推到明处。");
    }
    if (hooks.has("prose:verdict") && stage === "ripple") {
      lines.push(roleId === "anjie"
        ? "投票一旦落笔，后面的每一次见面都会带着旧票痕。"
        : "票纸会替之后的关系先写下裂痕。");
    }
    if (hooks.has("prose:karl")) {
      lines.push(roleId === "anjie"
        ? "卡尔的火气会让任何靠近他的人都多算一步。"
        : "卡尔这个名字会继续烧，直到有人把它压下去。");
    }
    if (hooks.has("prose:patrick")) {
      lines.push(roleId === "patrick"
        ? "你自己的名字也在悄悄变重。"
        : "派翠克的异样会越来越难再被当成普通恐慌。");
    }
    if (hooks.has("prose:meruru") && stage !== "opening") {
      lines.push(roleId === "fan"
        ? "梅露露这个名字会继续纠缠你对宽恕的理解。"
        : "梅露露的影子会把后面的沉默拉长。");
    }
    if (hooks.has("prose:meruru")) {
      lines.push(roleId === "patrick"
        ? "梅露露身上的光会被你记得很久。"
        : "梅露露的名字会在空气里拖得很长。");
    }
    if (roomText && stage === "ripple") {
      lines.push(roleId === "yamada"
        ? `${roomText}会成为你之后回想这一步时最先浮出的场景。`
        : `${roomText}会替这一步留下一枚不会立刻散掉的回声。`);
    }
    if (!lines.length) return "";
    return ` ${lines.join(" ")}`;
  }

  function buildBranchEcho(roleId, branchClass, draftState, stage, targetName, roomText) {
    const suspicion = draftState.suspicion?.player?.karl || 0;
    const alliances = Object.keys(draftState.alliances || {}).length;
    if (branchClass === "rest" && stage === "opening") {
      return roleId === "fan"
        ? "你把这当成一段短暂的赦免。"
        : "你知道这只是让后面更快到来的片刻停顿。";
    }
    if (branchClass === "discovery" && stage === "outcome") {
      return roleId === "anjie"
        ? "这类发现会直接补进你的笔记链。"
        : "你刚刚把一块拼图钉进了位置。";
    }
    if (branchClass === "encounter" && stage === "encounter") {
      return targetName
        ? `你和${targetName}之间的距离，已经比刚才更难装作没变化。`
        : "这次碰面会让关系表上的数值开始动。";
    }
    if (branchClass === "verdict" && stage === "ripple") {
      return `投票后的空气会比之前更硬。${alliances ? "而同盟也会因此更像临时借来的刀。" : ""}`;
    }
    if (branchClass === "anchor") {
      return stage === "opening"
        ? "主干事件就在前方等你把它推开。"
        : "这一步不会被轻易忘掉。";
    }
    if (suspicion > 20 && stage === "ripple") {
      return "卡尔的怀疑已经足够高，后面再碰面时只会更难装作无事。";
    }
    if (stage === "encounter" && targetName && roomText) {
      return `你和${targetName}在${roomText}里的这次交汇，会把后面要说的话都提前挤出一点锋口。`;
    }
    return "";
  }

  function buildRoleWordSentence(roleId, effects) {
    if (!effects.addWords.length) return "";
    if (roleId === "yamada") return `你记下密码词“${effects.addWords.join("、")}”。`;
    return roleId === "patrick"
      ? `密码词“${effects.addWords.join("、")}”先让你记住门。`
      : `你把新出现的密码词“${effects.addWords.join("、")}”记得很重，因为这类可重复验证的线索在当前局面里稀缺得近乎奢侈。`;
  }

  function buildRoleRelationSentence(roleId, encounterId, effects, draftState, slotId = "") {
    if (!encounterId || !effects.relations[encounterId]) return "";
    const delta = effects.relations[encounterId];
    const target = ENTITIES[encounterId].short;
    const prior = draftState.relations[encounterId] || 0;
    const stage = String(slotId || "")[0] || "1";
    if (roleId === "patrick") {
      return delta > 0
        ? `${target}对你软了一线。`
        : `${target}把距离收回了一寸。`;
    }
    if (roleId === "yamada") {
      return delta > 0
        ? `${target}对你松了一线。`
        : `${target}开始防你了。`;
    }
    if (delta > 0) {
      return prior >= 10
        ? stage === "4" || stage === "5"
          ? `${target}已经更愿意站近一点，后面很可能跟着改口。`
          : `${target}原本就不算远的态度，又向你靠近了一步。`
        : stage === "4" || stage === "5"
          ? `${target}先没再后退，这点松动到了表态时会更显眼。`
          : `${target}对你的戒心松了一线，这就够你继续往前试。`;
    }
    return stage === "4" || stage === "5"
      ? `${target}开始防你，后面表态时只会更难拉回。`
      : `${target}被你这一步推远了，下次再见只会更防。`;
  }

  function buildAnjieOpeningParagraph(slotId, location, visitCount, intent) {
    const base = getRoleSlotBase("anjie", slotId);
    const detail = getRoleActionDetail("anjie", intent);
    const visit = describeSceneVisit("anjie", location, visitCount);
    const action = detail?.opening || (intent.tags.includes("rest") ? "你先停下来，给过热的思路降温。" : "你先把目标拆开，再决定从哪一步下手。");
    const deduction = detail?.deduction || "只要还能列出步骤和核查顺序，你就还没彻底被恐惧追上。";
    const mental = intent.tags.includes("rest")
      ? "你先逼自己坐稳。可一安静下来，人物站位、时间顺序和证词冲突就会自己重排。"
      : "你没有把这一步当成冲动，而是当成必须立刻核验的程序。";
    return buildRouteCompactParagraph([visit, base, mental, action, deduction], 210);
  }

  function buildPatrickOpeningParagraph(slotId, location, visitCount, intent) {
    const base = getRoleSlotBase("patrick", slotId);
    const detail = getRoleActionDetail("patrick", intent);
    const visit = describeSceneVisit("patrick", location, visitCount);
    const action = detail?.opening || (intent.tags.includes("rest") ? "你停在原地，先把呼吸与心跳都压稳。" : "你先朝目标地点走去。");
    const deduction = detail?.deduction || "你先记方向，不急着下结论。";
    const mental = intent.tags.includes("rest")
      ? "你先放轻呼吸。"
      : "你把这一步当成一次追查。";
    return `${visit}${base}${mental}${action}${deduction}`;
  }

  function buildYamadaOpeningParagraph(slotId, location, visitCount, intent) {
    const base = getRoleSlotBase("yamada", slotId);
    const detail = getRoleActionDetail("yamada", intent);
    const visit = describeSceneVisit("yamada", location, visitCount);
    const action = detail?.opening || (intent.tags.includes("rest") ? "你先把表情压稳。" : "你先挑一张最稳的脸靠近现场。");
    const deduction = detail?.deduction || "先让人看错你，再从错觉里取信息。";
    const mental = intent.tags.includes("rest")
      ? "你先压住呼吸，别让真脸露出来。"
      : "你不急着站队，只想先看清这一幕该挂哪张脸。";
    return buildYamadaRouteParagraph([visit, base, mental, action, deduction]);
  }

  function buildDeboraOpeningParagraph(slotId, location, visitCount, intent) {
    const base = getRoleSlotBase("debora", slotId);
    const detail = getRoleActionDetail("debora", intent);
    const visit = describeSceneVisit("debora", location, visitCount);
    const action = detail?.opening || (intent.tags.includes("rest") ? "你先把呼吸压回去。" : "你先把自己摆成最不显眼的大人。");
    const deduction = detail?.deduction || "别人先低估你，你就还有余地。";
    const mental = intent.tags.includes("rest")
      ? "停下来以后，先冒头的还是旧现场。"
      : "你先藏起熟练，只把狼狈摆给别人看。";
    return compactRouteParagraph("debora", [visit, base, mental, action, deduction], 170);
  }

  function buildFanOpeningParagraph(slotId, location, visitCount, intent) {
    const base = getRoleSlotBase("fan", slotId);
    const detail = getRoleActionDetail("fan", intent);
    const visit = describeSceneVisit("fan", location, visitCount);
    const action = detail?.opening || (intent.tags.includes("rest") ? "你先抱紧祷词，压住心跳。" : "你先把这一步当成试炼。");
    const mental = intent.tags.includes("rest")
      ? "你停下来时，痛感和祷词总会一起浮上来。"
      : "你容易把异常看成启示，所以先留一分警惕。";
    return compactRouteParagraph("fan", [visit, base, mental, action], 180);
  }

  function buildZicheOpeningParagraph(slotId, location, visitCount, intent) {
    const base = getRoleSlotBase("ziche", slotId);
    const detail = getRoleActionDetail("ziche", intent);
    const visit = describeSceneVisit("ziche", location, visitCount);
    const action = detail?.opening || (intent.tags.includes("rest") ? "你先停住，只让耳朵工作。" : "你先量退路和死角。");
    const deduction = detail?.deduction || "只要结构还看得懂，局面就还有地方抢。";
    const mental = intent.tags.includes("rest")
      ? "所谓休息，对你来说只是暂停动作。"
      : "你先把房间拆成地形图，再看值不值得信人。";
    return compactRouteParagraph("ziche", [visit, base, mental, action, deduction], 170);
  }

  function buildAnjieEncounterParagraph(slotId, encounterId, location, intent, draftState) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const read =
      encounterId === "patrick"
        ? "派翠克太平静了，平静得像把异常捧在手里。"
        : encounterId === "karl"
          ? "卡尔的问题不只在音量，而是他总把情绪说成秩序。"
          : encounterId === "meruru"
            ? "梅露露知道得太多，也始终没把话说全。"
            : encounterId === "emily"
              ? "艾米莉的害怕很真，也因此更要和线索分开看。"
              : `${target}站在那里，像一份还没拆开的证词。`;
    const reaction = aggressive
      ? `${target}比语言更快地绷紧了，像已经把你记进下一轮危险名单。`
      : positive
        ? `${target}因为你的措辞稍微松了一线，已经够你继续试探。`
        : `${target}没有立刻亮态度，这种停顿本身就是信息。`;
    const trust = relation >= 14
      ? `你已经摸到和${target}对话的节奏，知道该追问还是该让一步。`
      : `你不敢把这次相遇浪费在寒暄上。下一次，局势未必还给你这么完整的观察距离。`;
    return buildRouteCompactParagraph([`你在${location.name}和${target}对上时，先排出的不是客套，而是提问顺序。`, read, reaction, trust], 220);
  }

  function buildPatrickEncounterParagraph(slotId, encounterId, location, intent, draftState) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const read =
      encounterId === "anjie"
        ? "安洁的魂火一直在抖。"
        : encounterId === "karl"
          ? "卡尔胸口那团火烧得太旺了。"
          : encounterId === "meruru"
            ? "梅露露身上的气息像两层影子叠在一起。"
            : encounterId === "emily"
              ? "艾米莉的光太薄了。"
              : `${target}身上的光有点乱。`;
    const reaction = aggressive
      ? `${target}马上察觉到你盯得太深，呼吸短了一拍。`
      : positive
        ? `${target}先迟疑了一下，还是停在了你面前。`
        : `${target}一时分不清你的安静是礼貌还是审视。`;
    const trust = relation >= 14
      ? "你知道这次沉默也算表态。"
      : "你不想把这次碰面浪费在寒暄上。";
    return `你在${location.name}遇见${target}时，先感到的不是表情，而是对方此刻气息的冷热。${read}${reaction}${trust}`;
  }

  function buildYamadaEncounterParagraph(slotId, encounterId, location, intent, draftState) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const read =
      encounterId === "emily"
        ? "你最怕她真的信你，也最怕她不信。"
        : encounterId === "karl"
          ? "卡尔最恨别人一边示弱，一边记他的失控。"
          : encounterId === "patrick"
            ? "派翠克太安静，安静得像会看回你。"
            : `${target}像在等你先交一版自己。`;
    const reaction = aggressive
      ? `${target}眼底那一下收缩，比反驳更值得记。`
      : positive
        ? `${target}先被你的柔软口气骗慢了一拍。`
        : `${target}还是没看清你想站哪边。`;
    const trust = relation >= 14
      ? `你们已经不是初见，所以这次失手会更疼。`
      : "你只想让这次接触留点余地。";
    return buildYamadaRouteParagraph([`你在${location.name}碰见${target}时，先把语速压低。`, read, reaction, trust]);
  }

  function buildDeboraEncounterParagraph(slotId, encounterId, location, intent, draftState) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const read =
      encounterId === "karl"
        ? "卡尔越高声，你越知道他快失手。"
        : encounterId === "ziche"
          ? "子车一旦认准你没用，反而最好观察。"
          : encounterId === "anjie"
            ? "安洁的紧绷在提醒你别装得太真。"
            : `${target}在试探你到底是真的慌，还是故意装慌。`;
    const reaction = aggressive
      ? `你差点露出真本事，好在及时收住。`
      : positive
        ? `${target}先把你归进“无害的大人”，正合你意。`
        : `${target}还没决定该不该继续低估你。`;
    const trust = relation >= 14
      ? `一旦对方把命往你这里偏一点，你就很难继续装。`
      : `你不求说服，只求先让对方忘了防你。`;
    return compactRouteParagraph("debora", [`你在${location.name}碰见${target}时，先把自己摆成普通大人。`, read, reaction, trust], 170);
  }

  function buildFanEncounterParagraph(slotId, encounterId, location, intent, draftState) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const read =
      encounterId === "karl"
        ? "卡尔胸口那团火，已经快把正义烧成了借口。"
        : encounterId === "meruru"
          ? "梅露露太像会被献上的那一个。"
          : encounterId === "patrick"
            ? "派翠克的平静总让你分不清那是安息还是坠落。"
            : `${target}看上去像还没决定要把恐惧交给谁。`;
    const reaction = aggressive
      ? `${target}一下绷紧，像已经预感到你的温柔会长出倒刺。`
      : positive
        ? `${target}因为你的低声安抚，短暂放低了一寸防备。`
        : `${target}没有立即接话，只让沉默先探你。`;
    const trust = relation >= 14
      ? `你已经知道对方哪类伤口最容易被你碰开。`
      : `你不急着把话说满，因为真正留痕的往往不是道理。`;
    return compactRouteParagraph("fan", [`你在${location.name}见到${target}时，先把声音放轻。`, read, reaction, trust], 180);
  }

  function buildZicheEncounterParagraph(slotId, encounterId, location, intent, draftState) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const read =
      encounterId === "karl"
        ? "卡尔最危险的不是力气，是他会把失控包装成秩序。"
        : encounterId === "patrick"
          ? "派翠克越安静，你越不想背对她。"
          : encounterId === "emily"
            ? "艾米莉越慌，周围越容易一起乱。"
            : `${target}先要被你判断的是威胁，不是性格。`;
    const reaction = aggressive
      ? `${target}本能后撤半步，你顺势卡住距离。`
      : positive
        ? `${target}没料到你会先开口，警惕慢了一瞬。`
        : `${target}还在试着看穿你的底线，可你没给。`;
    const trust = relation >= 14
      ? `你们之间有前账，这次对视不会只是寒暄。`
      : `你不想浪费这次相遇，下次再见可能隔着新刀口。`;
    return compactRouteParagraph("ziche", [`你在${location.name}撞见${target}时，先想距离和退路。`, read, reaction, trust], 170);
  }

  function buildAnjieOutcomeParagraph(slotId, encounterId, effects, intent, draftState) {
    const finding = buildRoleFindingSentence("anjie", effects, slotId);
    const word = buildRoleWordSentence("anjie", effects);
    const relation = buildRoleRelationSentence("anjie", encounterId, effects, draftState, slotId);
    const strain = slotId === "5.1"
      ? "最难受的不是惊吓，而是逻辑在超自然面前直接断线。你还想重排它，却已经没有足够完整的工具。"
      : effects.stats.san < 0
        ? "代价很明确。理智让了位，那股熟悉的焦躁又顺着脊背往上爬。"
        : effects.stats.mp < 0
          ? "为了维持判断和推进速度，你又提前透支了精力。身体的虚弱没走，只是被你压到后面。"
          : "你把新信息并进原有链条，同时删掉几条站不住脚的旧假设。逻辑还没闭合，但至少没有塌。";
    return buildRouteCompactParagraph([finding, word, relation, strain, "你立刻知道，这段结果会改写后面的判断顺序。"], 200);
  }

  function buildPatrickOutcomeParagraph(slotId, encounterId, effects, intent, draftState) {
    const finding = buildRoleFindingSentence("patrick", effects, slotId);
    const word = buildRoleWordSentence("patrick", effects);
    const relation = buildRoleRelationSentence("patrick", encounterId, effects, draftState, slotId);
    const strain = slotId === "5.1"
      ? "到了这一步，你快分不清自己和那股饥饿，但你还记得怎么克制。"
      : effects.stats.san < 0
        ? "代价很清楚。那阵回声顺手带走了一点平静。"
        : effects.stats.mp < 0
          ? "你把心力借给了不属于此世的声音，脚下发虚。"
          : "你先把这份结果收住。";
    return `${finding}${word}${relation}${strain}`;
  }

  function buildYamadaOutcomeParagraph(slotId, encounterId, effects, intent, draftState) {
    const finding = buildRoleFindingSentence("yamada", effects, slotId);
    const word = buildRoleWordSentence("yamada", effects);
    const relation = buildRoleRelationSentence("yamada", encounterId, effects, draftState, slotId);
    const strain = slotId === "5.1"
      ? "最糟的是，你惯用的伪装开始失效。"
      : effects.stats.san < 0
        ? "你还能维持表情，可脑子里的线已经在疼。"
        : effects.stats.mp < 0
          ? "你把力气花在姿态和判断上，疲态开始漏出来。"
          : "你先把刚才的眼神、停顿和漏洞记下来。";
    return buildYamadaRouteParagraph([finding, word, relation, strain, buildOutcomeTail("yamada", slotId)]);
  }

  function buildDeboraOutcomeParagraph(slotId, encounterId, effects, intent, draftState) {
    const finding = buildRoleFindingSentence("debora", effects, slotId);
    const word = buildRoleWordSentence("debora", effects);
    const relation = buildRoleRelationSentence("debora", encounterId, effects, draftState, slotId);
    const strain = slotId === "5.1"
      ? "到了这一步，再装没用也挡不住别人盯你。"
      : slotId === "4.1"
        ? "你嘴上还在圆场，心里已经先把责任排了序。"
      : effects.stats.san < 0
        ? "旧现场的感觉又贴回来，连笑都更费力。"
        : effects.stats.mp < 0
          ? "你靠冷静换到结果，但后劲不会轻。"
          : "你嘴上还在圆场，身体却先把风险排上了。";
    return compactRouteParagraph("debora", [finding, word, relation, strain, buildOutcomeTail("debora", slotId)], 130);
  }

  function buildFanOutcomeParagraph(slotId, encounterId, effects, intent, draftState) {
    const finding = buildRoleFindingSentence("fan", effects, slotId);
    const word = buildRoleWordSentence("fan", effects);
    const relation = buildRoleRelationSentence("fan", encounterId, effects, draftState, slotId);
    const strain = slotId === "5.1"
      ? "最难受的不是异变，是你还想救它。"
      : effects.stats.san < 0
        ? "祷词还在，可偏执也更清楚了。"
        : effects.stats.mp < 0
          ? "你把心力借给安抚和祷词，回神时已发虚。"
          : "你先替它找了一层还能承受的解释。";
    return compactRouteParagraph("fan", [finding, word, relation, strain, buildOutcomeTail("fan", slotId)], 130);
  }

  function buildZicheOutcomeParagraph(slotId, encounterId, effects, intent, draftState) {
    const finding = buildRoleFindingSentence("ziche", effects, slotId);
    const word = buildRoleWordSentence("ziche", effects);
    const relation = buildRoleRelationSentence("ziche", encounterId, effects, draftState, slotId);
    const strain = slotId === "5.1"
      ? "异变一来，所有人都乱了，可你只认路线。"
      : effects.stats.san < 0
        ? "你把惊悸压下，只留能执行的部分。"
        : effects.stats.mp < 0
          ? "你花掉体力和专注，换来暂时的主动权。"
          : "这些成果很快就在你脑子里排成新路线。";
    return compactRouteParagraph("ziche", [finding, word, relation, strain, buildOutcomeTail("ziche", slotId)], 130);
  }

  function buildAnjieRippleParagraph(slotId, encounterId, effects, intent) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "更麻烦的是，你在别人眼里的轮廓也更清楚了。以后再想躲回“体弱又无害”的印象后面，会越来越难。"
      : "这次动作表面上没掀起大波澜，可真正要命的，往往正是这种没被点破的变化。";
    const bond = effects.flags.patrickBond
      ? "你和派翠克之间那条原本还算克制的线被真正系紧。到了终局，它可能替你挡下一次追猎，也可能逼你面对更疼的告别。"
      : effects.flags.karlExposed
        ? "卡尔不会忘记你在他叙事里打下的缺口。下次再争执，他更可能先把你当成障碍。"
        : effects.flags.emilyProtected
          ? "艾米莉已经开始把你视作可以追着跑的人。那份依赖之后是助力还是拖累，要看你还有没有余裕继续接住。"
          : "";
    return buildRouteCompactParagraph([stake || "你很清楚，这不是会被当场结算完的小选择。", exposure, bond, "你得准备在后面某个时段替它付账。"], 200);
  }

  function buildPatrickRippleParagraph(slotId, encounterId, effects, intent) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "你在众人命运里的位置被推前了。"
      : "命运线已经偏了一点。";
    const bond = effects.flags.patrickBond
      ? "你伸出去的那只手被认真接住过，所以以后放手会更疼。"
      : effects.flags.emilyProtected
        ? "艾米莉的魂火往你这边偏了一寸。"
        : effects.flags.karlExposed
          ? "卡尔已经把你的名字记进去了。"
          : "";
    return `${stake || "你知道这段回响不会立刻结束。"}${exposure}${bond}`;
  }

  function buildYamadaRippleParagraph(slotId, encounterId, effects, intent) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "别人眼里的你更清楚了一点。"
      : "这一步不大，却已经替后面的再见写了草稿。";
    const bond = effects.flags.emilyProtected
      ? "艾米莉会更依赖你。"
      : effects.flags.karlExposed
        ? "卡尔不会忘记你让他露过裂口。"
        : effects.flags.patrickBond
          ? "你和派翠克之间那条线已经没法装不存在。"
          : "";
    return buildYamadaRouteParagraph([stake || "你知道自己已经改动了一小截时间线。", exposure, bond, "之后再见，不会还是原样。"]);
  }

  function buildDeboraRippleParagraph(slotId, encounterId, effects, intent) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "你那层“普通阿姨”的壳又薄了一点。"
      : "现在没爆开的东西，最容易在后面翻倍找回来。";
    const bond = effects.flags.emilyProtected
      ? "被你接住的人之后会更习惯往你这边靠。"
      : effects.flags.karlExposed
        ? "卡尔会记得是谁看见过他最难看的样子。"
        : effects.flags.patrickBond
          ? "你与派翠克之间的纠葛也被这一步拧紧了。"
          : "";
    return compactRouteParagraph("debora", [stake || "你比谁都清楚，小决定最容易长成大事故。", exposure, bond, "你得继续装无害，也得准备收残局。"], 170);
  }

  function buildFanRippleParagraph(slotId, encounterId, effects, intent) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "别人会更早记住你的偏执和温柔。"
      : "这一步没当场结算，却会在后面回声更大。";
    const bond = effects.flags.patrickBond
      ? "你对派翠克伸出的手，之后会回来讨价。"
      : effects.flags.emilyProtected
        ? "艾米莉那边的恐惧也更容易朝你靠近。"
        : effects.flags.karlExposed
          ? "卡尔不会忘记你站到过他的火前。"
          : "";
    return compactRouteParagraph("fan", [stake || "你知道后果不会只是偶然。", exposure, bond, "从这一步起，牺牲会更频繁地出现。"], 150);
  }

  function buildZicheRippleParagraph(slotId, encounterId, effects, intent) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "别人眼里那个最会算路的人，也被你自己越坐越实。"
      : "这一步看似普通，却已经改了后面几条活路的先后顺序。";
    const bond = effects.flags.emilyProtected
      ? "艾米莉之后更可能追着你跑。"
      : effects.flags.karlExposed
        ? "卡尔也更可能把你当成先处理的障碍。"
        : effects.flags.patrickBond
          ? "你和派翠克之间的距离被这一步重新定过。"
          : "";
    return compactRouteParagraph("ziche", [stake || "这一步没有白走，但也绝不免费。", exposure, bond, "从现在起，你得更快、更狠，也更早取舍。"], 150);
  }

  function buildAnjieQuote(encounterId, slotId) {
    const slotQuotes = {
      "2.1": "你压低声音提醒自己：“先看证据，再看谁先解释。”",
      "2.2": "你看着人群想：“价值一旦公开，就会立刻变成靶子。”",
      "2.3": "你把笔尖停住：“名单不能写错，错一次就会害死人。”",
      "2.4": "你看着桌边众人：“逻辑一旦端上桌，就不再只属于我。”",
      "3.1": "你握紧笔记本：“从现在开始，每一分钟都得有名字。”",
      "3.2": "你盯着破洞边缘：“路线会说话，前提是我别先骗自己。”",
      "3.3": "你望着异象问自己：“我要带着什么样的答案活下去？”",
      "3.4": "你把纸页压平：“再不把票向推稳，后面就只剩失控。”",
      "4.1": "你盯住卡尔：“今天要么拆穿他，要么被他盖过去。”",
      "4.2": "你听着争辩心想：“每一句辩护，都可能变成新的破绽。”",
      "4.3": "你在落票前提醒自己：“这不是漂亮推理，这是要命的选择。”",
      "4.4": "你看着票纸：“写下名字的人，也得负责名字之后的死活。”",
      "5.2": "你逼自己别停：“门没开之前，崩溃没有用。”",
      "5.3": "你举枪时手心发冷：“我不是不敢开枪，我是不敢承担开枪以后。”",
    };
    if (slotQuotes[slotId]) return slotQuotes[slotId];
    if (slotId === "5.1") return "你喉咙发紧，却还是逼自己开口：“先别崩。位置、路线、出口，至少这些还得有人继续记着。”";
    if (slotId === "5.4") return encounterId === "patrick" ? "你握紧那封信，对她低声说：“我会把名字带出去。可你也别擅自替所有人结束。”" : "你把呼吸压平，提醒自己：“先开门，后回头。现在还不是让情绪赢的时候。”";
    if (encounterId === "patrick") return "你把笔尖停在纸面上，低声对她说：“请先别把自己交给命运，我还没核对完你。”";
    if (encounterId === "karl") return "你看着卡尔，语气很平：“大声不会让你的逻辑变完整，只会让破绽更响。”";
    if (encounterId === "meruru") return "你压低声音问：“你到底是在协助我们逃生，还是在引导我们把故事演完？”";
    return "你把问题问得很短，因为真正有用的答案，往往藏在对方来不及修饰的第一秒。";
  }

  function buildPatrickQuote(encounterId, slotId) {
    const slotQuotes = {
      "1.1": "你在冷光里提醒自己：“先记回声。”",
      "1.2": "你听着众人的呼吸：“先听谁太稳。”",
      "1.3": "你摸过门框：“房间会先露口风。”",
      "1.4": "你停在拐角前：“别错过最轻的声。”",
      "2.1": "你望向深处：“埋着的东西还没干净。”",
      "2.2": "你压低声音：“掀开的帘子落不回去。”",
      "2.3": "你听着震动：“先记门的节奏。”",
      "2.4": "你看着灯下众人：“谁最完整，谁最危险。”",
      "3.1": "你对走廊低声说：“广播停了，送葬没停。”",
      "3.2": "你站在案发处想：“谁怕死，谁怕真相。”",
      "3.3": "你望向天幕：“外面也没打算作证。”",
      "3.4": "你合拢手指：“每句安抚都可能落票。”",
      "4.1": "你看着众人胸口的火：“先看谁想牺牲别人。”",
      "4.2": "你抚过桌沿：“祭具不会说谎。”",
      "4.3": "你低声道：“告别的话，最难撒谎。”",
      "4.4": "你看着票纸：“写下去就不再只是名字。”",
      "5.1": "你在剧痛里留下一句：“快走，趁我还记得你们。”",
      "5.2": "你盯着前路：“先问还能不能活。”",
      "5.3": "你望向装置区：“门会开，代价不会轻。”",
      "5.4": encounterId === "anjie"
        ? "你把最后一点清醒递给她：“替我送出去。”"
        : "你望着白门低声道：“愿它容得下安息。”",
    };
    return slotQuotes[slotId] || "你把声音放轻：“别急着替谁定罪，先听回声落在哪边。”";
  }

  function buildGenericOpeningOverride(roleId, slotId, location, visitCount, intent, module, draftState) {
    const base = getRoleSlotBase(roleId, slotId);
    const detail = getRoleActionDetail(roleId, intent);
    if (!base && !detail) return "";
    const visit = describeSceneVisit(roleId, location, visitCount);
    const action = detail?.opening || `你将“${stripRestLabel(intent.clean)}”当作这一时段最值得下注的动作。`;
    const deduction = detail?.deduction || "这一步未必足够解释一切，却足够替下一轮相遇提前改写一部分空气。";
    const rest = intent.tags.includes("rest")
      ? "你把自己从局势里抽离片刻，试图整理呼吸、姿态或手里的物件。可真正不会停下来的，是别处也在继续往前走的时间。"
      : `你没有让自己只依赖本能，而是把这一步当成接下来许多后果的起点。`;
    return `${visit}${base}${location.mood}在这一刻像主动朝你贴近。${rest}${action}${deduction}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
  }

  function buildGenericEncounterOverride(roleId, encounterId, location, intent, draftState, module) {
    const target = ENTITIES[encounterId]?.short || "对方";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    const relation = draftState.relations[encounterId] || 0;
    const stance =
      roleId === "fan"
        ? "你先注意到的往往不是武器或站位，而是对方在恐惧里还想把哪句话硬撑成体面。"
        : roleId === "ziche"
          ? "你第一反应仍旧是算距离、退路和对方有没有可能突然动手。"
          : roleId === "yamada"
            ? "你看着对方的同时，也在确认自己此刻该摆出哪一版表情最不吃亏。"
            : "你嘴上也许还挂着无害的语气，心里已经开始记对方的动作和破绽。";
    const reaction = aggressive
      ? `${target}的警惕立刻被你这一步撬高，连空气都跟着收紧。`
      : positive
        ? `${target}因为你的姿态稍微松了一线，可那点松动究竟会长成信任还是依赖，还得往后看。`
        : `${target}没有立刻交出明确态度，像也在衡量你究竟值不值得被靠近。`;
    const trust = relation >= 12
      ? `你们之间已经累积起一点前情，所以这次相遇远不只是第一次见面时的礼貌交换。`
      : `你不打算让这次接触白白流走，因为在这种地方，下一次再见往往已经隔着新的怀疑。`;
    return `你在${location.name}碰见${target}时，先把局面在心里摆正。${stance}${reaction}${trust}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
  }

  function buildGenericOutcomeOverride(roleId, slotId, encounterId, effects, intent, draftState, module) {
    const finding = buildRoleFindingSentence(roleId, effects, slotId);
    const word = buildRoleWordSentence(roleId, effects);
    const relation = buildRoleRelationSentence(roleId, encounterId, effects, draftState, slotId);
    const cost =
      effects.stats.san < 0
        ? "代价并不抽象。有人是手抖，有人是喉咙发紧，有人则只能靠更熟悉的偏执、冷静或玩笑把自己重新撑起来。"
        : effects.stats.mp < 0 || effects.stats.fatigue > 0
          ? "你把体力、精神或注意力往前透支了一点，好换来这次动作暂时看得见的结果。"
          : "结果没有立刻把局面定死，却足够让你之后的判断不再停留在原地。";
    return `${finding}${word}${relation}${cost}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`;
  }

  function buildGenericRippleOverride(slotId, encounterId, effects, intent, module, draftState) {
    const stake = intent.tags.includes("rest") ? SLOT_STAKES[slotId]?.rest : SLOT_STAKES[slotId]?.after;
    const exposure = effects.stats.exposure > 0 || effects.stats.alertness > 6
      ? "你的轮廓因此在别人眼里又亮了一点。接下来再想躲回最初那层安全印象后面，会更吃力。"
      : "这一步看似不大，却已经在后面的某个时段里埋下了会被重新翻出来的余波。";
    const bond = effects.flags.emilyProtected
      ? "艾米莉的路线因此朝你这边偏了一点。那份偏移是救赎、拖累还是遗憾，还得看后面谁先撑不住。"
      : effects.flags.karlExposed
        ? "卡尔已经把这笔记在心里。下次再见，他更可能把你当成需要优先处理的麻烦。"
      : effects.flags.patrickBond
          ? "你与派翠克之间那根若隐若现的线被真正拉紧了，终局时它一定会回来索要代价。"
          : "";
    return `${stake || "时间线已经因为这次选择轻轻偏了一下。"}${exposure}${bond}${buildModuleStageLine(draftState.selectedRole || "fan", module, draftState, "ripple", encounterId)}`;
  }

  function buildGenericQuoteOverride(roleId, encounterId, slotId) {
    const target = encounterId ? ENTITIES[encounterId].short : "对方";
    if (slotId === "5.1") {
      return roleId === "fan"
        ? "你几乎是在哭着念出祷词：“别在这里失去名字，别让这地方替你定义结局。”"
        : roleId === "ziche"
          ? "你盯着前方，咬紧牙关：“别愣着。能跑的跑，能挡的挡，别把命浪费在尖叫上。”"
          : roleId === "yamada"
            ? "你压下嗓音里的颤：“现在开始别演了。想活的，就先跟上我。”"
            : "你挤出一口气，低声骂了一句：“行吧，真到要命的时候，还是得有人把烂摊子捡起来。”";
    }
    if (roleId === "fan") return `你轻声对${target}说：“若你仍愿意开口，我会连你的罪与恐惧一并记住。”`;
    if (roleId === "ziche") return `你盯着${target}，只留下一句：“少废话，把有用的先拿出来。”`;
    if (roleId === "yamada") return `你把声音放得恰到好处：“你可以继续装，我也可以继续看。我们都别急。”`;
    if (roleId === "debora") return `你干笑了一下，对${target}说：“阿姨我可能不灵光，但谁在心虚还是看得出来一点的。”`;
    if (roleId === "patrick") return `你盯着${target}，低声说：“别急着把答案说死，先听回声落在哪边。”`;
    return "";
  }

  function buildYamadaQuote(encounterId, slotId) {
    const target = encounterId ? ENTITIES[encounterId].short : "对方";
    switch (slotId) {
      case "1.1": return "你低声说：“先别急着看穿我。”";
      case "1.2": return "你说：“先让我看两眼，再决定信谁。”";
      case "1.3": return "你说：“我只是路过，别把我当答案。”";
      case "1.4": return `你对${target}说：“先别下结论。”`;
      case "2.1": return "你说：“我来补缺口，不代表我会交底。”";
      case "2.2": return "你说：“先别哭，把没说的说完。”";
      case "2.3": return "你说：“我还能撑住，先别把我写进弱者那边。”";
      case "2.4": return "你说：“先别把牌摊开，我还没看够他们的脸。”";
      case "3.1": return "你说：“梅露露死了，先别让表情替你作证。”";
      case "3.2": return "你说：“先把消息连起来，再谈谁像凶手。”";
      case "3.3": return "你说：“别看我，我现在只想把脸撑住。”";
      case "3.4": return "你说：“该交代的我会交代，但不是现在。”";
      case "4.1": return "你说：“先别定罪，证据还没排完。”";
      case "4.2": return "你说：“如果真要出事，先护艾米莉。”";
      case "4.3": return "你说：“真相可以晚点听，先听完这段录音。”";
      case "4.4": return "你说：“票先落下，后面的脸我来记。”";
      case "5.1": return "你压低声音：“现在开始别演了，想活的跟上。”";
      case "5.2": return "你说：“别怕，我还在。”";
      case "5.3": return "你说：“出口就在前面，先别倒。”";
      case "5.4": return "你说：“门开了，但我还不想把真脸交出去。”";
      default: return `你对${target}低声道：“先别急，我还在看。”`;
    }
  }

  function buildAnchorBeat(roleId, slotId, intent, encounterId, effects, draftState) {
    if (slotId === "1.1") {
      const intro = roleId === "patrick"
        ? "对讲机里的梅露露把规则一条条念出来：五小时、投票、四台发电机、四个密码词，还有一场被叫成游戏的献祭。"
        : roleId === "anjie"
          ? "对讲机里的梅露露把规则拆成极漂亮也极危险的五个小时：投票、发电机、密码词、行动限制，还有一场被伪装成流程的处决。"
          : "对讲机里的梅露露依旧用那种过分轻软的声音解释规则：五小时、投票、四台发电机、四个密码词，以及一场被故意讲得像游戏的献祭。";
      const tint = draftState.stats.truth > 1
        ? "你听得出，这不只是说明规则，更像有人早就排好了结局。"
        : "她说得越客气，这套规则越像排练过很多次。";
      return `${intro}${tint}`;
    }
    if (slotId === STORY_ANCHORS.firstGather) {
      const clues = draftState.clues.length ? `第一轮线索已经在各人手里长出不同形状，${draftState.clues.slice(0, 3).join("、")}这些名字开始决定谁先开口。` : "第一轮见面时，谁都还拿着表面的礼貌，真正的判断却已经先在眼神里排队。";
      const trust = draftState.relations.patrick > 10 || draftState.relations.emily > 10
        ? "你能感觉到，至少有一两个人已经在不动声色地站队。"
        : "更多人还在试探，像怕一开口就把自己推成靶子。";
      return `${clues}${trust}`;
    }
    if (slotId === STORY_ANCHORS.secondGather) {
      const allianceText = Object.keys(draftState.alliances || {}).length
        ? "有人已经结成临时同盟，也有人把同盟两个字说得比敌意还轻。"
        : "所有人都把各自的碎片证据端上桌，却没有谁真的愿意先把底牌亮全。";
      const suspicionText = draftState.flags.karlExposed
        ? "卡尔的名字在这张桌子上已经不只是名字，更像一处正慢慢发热的裂口。"
        : "谁先补充，谁先隐瞒，几乎比线索本身更值得警惕。";
      return roleId === "patrick"
        ? `你回到聚集点时，大厅里已经堆满了别人带回来的声音和线索。焚烧房的焦痕、藤蔓房的喘息、藏书馆的拉丁文和电闸房的机械声全被拖到同一盏灯下。${allianceText}${suspicionText}`
        : `你回到聚集点时，大厅已经像一张被硬摊平的证物桌。焚烧房的焦痕、藤蔓房的呼吸、藏书馆的拉丁文和电闸房的机械声被拽到同一盏灯下。${allianceText}${suspicionText}`;
    }
    if (slotId === STORY_ANCHORS.meruruDeath) {
      const grief = draftState.flags.meruruBlessing
        ? "如果说还有什么比死亡更快，那就是你们此前对她的误判被同时改写。"
        : "那句通知没有留下任何修辞空间。";
      const karl = draftState.suspicion.player.karl > 20 || draftState.flags.karlExposed
        ? "几乎所有人都下意识看向卡尔，而卡尔也第一次没能把那份压力完全压回去。"
        : "整个疗养院却在这之后忽然安静得不正常，像所有门都在等别人先开第一把。";
      return roleId === "patrick"
        ? `广播突然切下来。梅露露死了。${grief}${karl}`
        : `广播像刀一样从天花板上落下来。梅露露死了。${grief}${karl}`;
    }
    if (slotId === "4.4") {
      const voteText = resolveVoteOutcome(intent, draftState);
      effects.flags.voteOutcome = voteText.target;
      const voteLead = draftState.keyChoices.vote_target
        ? `你先前埋下的投票方向已经开始回头咬人：${draftState.keyChoices.vote_target === "karl" ? "卡尔" : draftState.keyChoices.vote_target === "patrick" ? "派翠克" : draftState.keyChoices.vote_target === "self" ? "你自己" : "所有人"}都不会再被同样地看待。`
        : "每个人都在把最后一点犹豫换成更像借口的答案。";
      return `${voteText.paragraph}${voteLead}`;
    }
    if (slotId === STORY_ANCHORS.patrickAwakening || slotId === "5.1") {
      const mercyText = draftState.flags.patrickMercy
        ? "那阵异变没有立刻吞掉所有人，因为至少有一部分人曾经把他当成还能被拉回来的名字。"
        : "这场觉醒没有给任何人留出温和收场的余地。";
      const roleText = roleId === "patrick"
        ? "你先听见体内那阵迟到了太久的应答。它不像外来的声音，更像一直趴在骨缝背后等待苏醒的某种饥饿。"
        : "警报和尖叫几乎同时响起。派翠克的轮廓先在灯下扭曲，随后才生出真正会让人后退的形状。";
      const stateText = draftState.stats.truth > 4
        ? "如果你曾经相信这地方还有一层可解释的边界，那么那层边界就在这一秒当着你的面烧穿了。"
        : "那不只是怪物的出现，更像整个疗养院终于决定用最直接的方式执行它原本就写好的终局。";
      return roleId === "patrick"
        ? `${roleText}${mercyText}${draftState.stats.truth > 4 ? "你知道，自己已经回不到原来的那一边。" : "这座疗养院终于把真正的终局亮给你看了。"}`
        : `${roleText}${mercyText}${stateText}`;
    }
    if (slotId === "5.4") {
      const gate = draftState.flags.gateReady
        ? "门已经准备好把人放出去。"
        : "门仍像一块冷下来的判决书，等最后一个名字被写上去。";
      const choice = draftState.keyChoices.final_choice === "sacrifice"
        ? "你带着那个必须有人付出的答案走到这里。"
        : "你一路带来的，是活下去的冲动和不能轻易放下的亏欠。";
      return roleId === "patrick"
        ? `门会在这一刻开。白光从缝里压出来时，你一时分不清那是出口，还是另一场更大的梦。${gate}${choice}`
        : `门会在这一刻开，或者被时间逼着开。白光从缝里压出来时，你忽然分不清那到底是出口、审判之后的缓刑，还是另一种更宽敞的梦。${gate}${choice}`;
    }
    return "";
  }

  function resolveVoteOutcome(intent, draftState) {
    const playerVote = intent.voteTarget || "crowd";
    const score = {
      karl: 4 + (draftState.flags.karlExposed || 0) * 2 + (draftState.clues.includes("梅露露之死") ? 1 : 0),
      patrick: 2 + (draftState.stats.alertness > 55 ? 1 : 0) + (draftState.relations.patrick < 0 ? 1 : 0),
      self: Math.max(0, Math.floor((draftState.stats.exposure - 18) / 10)) + (draftState.stats.alertness > 65 ? 1 : 0),
    };
    if (playerVote === "karl") score.karl += 2;
    if (playerVote === "patrick") score.patrick += 2;
    if (playerVote === "self") score.self += 2;
    if (draftState.relations.emily > 12) score.karl += 1;
    if (draftState.flags.patrickBond) score.patrick -= 1;
    if (draftState.selectedRole === "yamada" && draftState.flags.emilyProtected) score.karl += 1;
    const target = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
    const targetName = target === "self" ? "你" : ENTITIES[target].short;
    return {
      target,
      paragraph: `石桌上的票纸被一张张翻开，房间里的呼吸都跟着变浅。有人坚持证据，有人坚持直觉，也有人只是把恐惧投给了最方便的名字。最后被推到处决位上的人是${targetName}。这一结果并不一定最接近真相，却足够把每个人之后的行动方式彻底改写。`,
    };
  }

  function buildOpeningParagraph(roleId, slotId, slot, location, visitCount, intent, module, draftState) {
    if (intent.tags.includes("rest")) {
      const genericRest = buildRestIntrospection(roleId, slotId, location, draftState);
      const rolePassage = buildRoleModulePassage(roleId, slotId, "opening", module, draftState, null);
      if (roleId === "anjie") return `${buildAnjieOpeningParagraph(slotId, location, visitCount, intent)}${genericRest}${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
      if (roleId === "patrick") return `${buildPatrickOpeningParagraph(slotId, location, visitCount, intent)}${genericRest}${rolePassage}`;
      const genericOverride = buildGenericOpeningOverride(roleId, slotId, location, visitCount, intent, module, draftState);
      return `${genericOverride}${genericRest}${rolePassage}`;
    }
    const rolePassage = buildRoleModulePassage(roleId, slotId, "opening", module, draftState, null);
    if (roleId === "anjie") return buildAnjieOpeningParagraph(slotId, location, visitCount, intent) + rolePassage + buildModuleStageLine(roleId, module, draftState, "opening");
    if (roleId === "patrick") return buildPatrickOpeningParagraph(slotId, location, visitCount, intent) + rolePassage;
    if (roleId === "yamada") return buildYamadaOpeningParagraph(slotId, location, visitCount, intent) + rolePassage;
    if (roleId === "debora") return buildDeboraOpeningParagraph(slotId, location, visitCount, intent) + rolePassage;
    if (roleId === "fan") return buildFanOpeningParagraph(slotId, location, visitCount, intent) + rolePassage;
    if (roleId === "ziche") return buildZicheOpeningParagraph(slotId, location, visitCount, intent) + rolePassage;
    const genericOverride = buildGenericOpeningOverride(roleId, slotId, location, visitCount, intent, module, draftState);
    if (genericOverride) return `${genericOverride}${rolePassage}`;
    const prefix = visitCount > 0
      ? `你再次靠近${location.name}。`
      : `你朝着${location.name}走去。`;
    if (roleId === "fan") {
      return `${prefix}${location.mood}先一步裹住你的呼吸，像一间临时搭好的告解室。你把“${stripRestLabel(intent.clean)}”当成一场被递到掌心里的试炼，甚至在心里先为它找好了经文注脚。只要痛感、霉味和警报都还在，你就还分得清自己没有从这场噩梦里醒来，而是被它认真地选中了。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
    }
    if (roleId === "ziche") {
      return `${prefix}${location.mood}没有吓住你，反而像一排能被立刻登记的客观参数。死角、退路、落脚点、能不能抄近路、有没有人会从背后摸上来，你先把这些东西在脑子里过了一遍，才允许自己去想“规则”这种第二位的问题。对你来说，先活着，别的都能往后排。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
    }
    if (roleId === "yamada") {
      return `${prefix}${location.mood}让你先把脚步放轻。你维持着那张最安全的脸，同时开始盘算这一步会漏出多少真实。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
    }
    if (roleId === "anjie") {
      return `${prefix}${location.mood}让你脑中的三条假设同时亮了起来。你一边压住过快的心跳，一边把“${stripRestLabel(intent.clean)}”拆成更具体的目标：你要看见什么、验证什么、拿走什么、又准备在什么地方留下自己的痕迹。只要还能列出步骤，你就还能把恐惧控制在笔尖以下。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
    }
    if (roleId === "debora") {
      return `${prefix}${location.mood}让你差一点本能地皱起眉。你及时把那个更像行内人的表情压了回去，换成更安全的那一张脸：有点累、有点慌、像跟不上局势的中年人。只有你自己知道，“${stripRestLabel(intent.clean)}”这种动作看着随便，实则每一步都在替退路和把柄重新洗牌。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
    }
    return `${prefix}${location.mood}沿着墙和灯影慢慢滑进你的知觉，像一段来自彼世的低语。你做出“${stripRestLabel(intent.clean)}”这件事时，心里并没有真正的迟疑。并非因为不怕，而是因为你比其他人更早听见了这座疗养院真正想被谁碰触、又真正想把谁留下。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "opening")}`;
  }

  function buildEncounterParagraph(roleId, slotId, encounterId, location, intent, draftState, module) {
    const rolePassage = buildRoleModulePassage(roleId, slotId, "encounter", module, draftState, encounterId);
    if (roleId === "anjie") return buildAnjieEncounterParagraph(slotId, encounterId, location, intent, draftState) + rolePassage + buildModuleStageLine(roleId, module, draftState, "encounter", encounterId);
    if (roleId === "patrick") return buildPatrickEncounterParagraph(slotId, encounterId, location, intent, draftState) + rolePassage;
    if (roleId === "yamada") return buildYamadaEncounterParagraph(slotId, encounterId, location, intent, draftState) + rolePassage;
    if (roleId === "debora") return buildDeboraEncounterParagraph(slotId, encounterId, location, intent, draftState) + rolePassage;
    if (roleId === "fan") return buildFanEncounterParagraph(slotId, encounterId, location, intent, draftState) + rolePassage;
    if (roleId === "ziche") return buildZicheEncounterParagraph(slotId, encounterId, location, intent, draftState) + rolePassage;
    const genericOverride = buildGenericEncounterOverride(roleId, encounterId, location, intent, draftState, module);
    if (genericOverride) return `${genericOverride}${rolePassage}`;
    const encounter = ENTITIES[encounterId];
    const targetName = encounter?.short || "某个模糊的人影";
    const positive = intent.tags.includes("social") || intent.tags.includes("protect");
    const aggressive = intent.tags.includes("attack");
    if (roleId === "fan") {
      const reaction = aggressive ? "对方的肩背一下子绷紧，像已经预感到你那份温柔会长出倒刺。" : positive ? `${targetName}看你的眼神先是迟疑，随后被你刻意放缓的语气拽住。` : `${targetName}没有立刻接话，只让那点沉默在你们之间停得很慢。`;
      return `你很快碰见了${targetName}。你先把声音放轻，像是在对一位尚未决定是否忏悔的弟兄或姊妹说话。${reaction}你并不急着把话一次说尽，因为你知道，真正能留下痕迹的往往不是论证本身，而是人面对被理解或被逼视时那一瞬间的呼吸。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
    }
    if (roleId === "ziche") {
      const reaction = aggressive ? `${targetName}本能地后撤了半步，你则顺势把距离卡成最有利的长度。` : positive ? `${targetName}大概没想到你会先开口，于是把警惕压成了短暂的停顿。` : `${targetName}试图从你的表情里读出立场，可你没给。`;
      return `角落里的脚步声替你先报了信。你和${targetName}的视线撞上时，脑子里最先弹出来的还是“能不能利用”。${reaction}你并不相信任何一场相遇是偶然，尤其在这种地方。谁先出现，谁先解释，谁的手离武器更近，都是比礼貌更可靠的材料。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
    }
    if (roleId === "yamada") {
      const reaction = aggressive ? `你记下了${targetName}眼底那一下收缩。` : positive ? `${targetName}被你放软的口气骗慢了一瞬。` : `${targetName}还是没看清你想要什么。`;
      return `你见到了${targetName}。先出场的还是那张无害的脸。${reaction}你不急着赢，只想让对方多露一点。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
    }
    if (roleId === "anjie") {
      const reaction = aggressive ? `${targetName}的反应比语言更快，像已经把你记进了下一轮的敌意名单。` : positive ? `${targetName}的态度因为你的措辞和证据稍微松了一线，这一点变化足够你继续下注。` : `${targetName}说的每一个字都像证词，可你知道证词从来不只存在于嘴里。`;
      return `你和${targetName}对上视线的那一瞬间，几乎立刻就在心里给这段对话列了提纲。先确认对方在意什么，再判断对方怕什么，最后决定该拿情报、逻辑还是沉默去推这一把。${reaction}你甚至能听见自己在心里写下一句注释：此人后续票向与态度，值得继续观察。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
    }
    if (roleId === "debora") {
      const reaction = aggressive ? `你差点露出真正会让人害怕的那种眼神，好在最后还是及时换回了更无害的表情。` : positive ? `${targetName}大概把你当成了最没威胁的那个，于是比面对别人时更愿意停下来。` : `${targetName}拿不准你是真没跟上，还是故意装没跟上。`;
      return `你碰见${targetName}时，先让自己像一个会被这地方轻易吓懵的普通人。手足无措、语气发虚、甚至抱怨一句“阿姨真跟不上”，这些都比亮出真正的判断安全得多。${reaction}可在更深一点的地方，你已经悄悄把对方的站位、习惯和反应速度全部收进了旧有的经验里。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
    }
    const reaction = aggressive ? `${targetName}在你的注视下明显僵住，像终于察觉到你看到的不止是表面。` : positive ? `${targetName}先是迟疑，随后被你温和却过分准确的观察逼得低下了视线。` : `${targetName}似乎不太明白你为什么会在这时这样安静，可安静本身就是你在询问。`;
    return `你在${location.name}里见到了${targetName}。与其说是“看见”，不如说是先感知到对方的灵魂在这一刻有多明亮、又有多碎。${reaction}你并不急着把自己知道的全说出来，因为真正的通灵从来不靠大声，它更像把一枚针稳稳压进别人最不愿被触碰的地方。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "encounter", encounterId)}`;
  }

  function buildOutcomeParagraph(roleId, slotId, encounterId, effects, intent, draftState, module) {
    const rolePassage = buildRoleModulePassage(roleId, slotId, "outcome", module, draftState, encounterId);
    if (roleId === "anjie") return dedupeJoinedNarrative(buildAnjieOutcomeParagraph(slotId, encounterId, effects, intent, draftState) + rolePassage + buildModuleStageLine(roleId, module, draftState, "outcome", encounterId));
    if (roleId === "patrick") return dedupeJoinedNarrative(buildPatrickOutcomeParagraph(slotId, encounterId, effects, intent, draftState) + rolePassage);
    if (roleId === "yamada") return dedupeJoinedNarrative(buildYamadaOutcomeParagraph(slotId, encounterId, effects, intent, draftState) + rolePassage);
    if (roleId === "debora") return dedupeJoinedNarrative(buildDeboraOutcomeParagraph(slotId, encounterId, effects, intent, draftState) + rolePassage);
    if (roleId === "fan") return dedupeJoinedNarrative(buildFanOutcomeParagraph(slotId, encounterId, effects, intent, draftState) + rolePassage);
    if (roleId === "ziche") return dedupeJoinedNarrative(buildZicheOutcomeParagraph(slotId, encounterId, effects, intent, draftState) + rolePassage);
    const genericOverride = buildGenericOutcomeOverride(roleId, slotId, encounterId, effects, intent, draftState, module);
    if (genericOverride) return dedupeJoinedNarrative(`${genericOverride}${rolePassage}`);
    const clueText = effects.addClues.length
      ? `你因此抓住了${effects.addClues.join("、")}这些更像证物的东西。`
      : "你没有拿到能立刻翻盘的铁证，却把局势的纹理摸得更清楚了一点。";
    const wordText = effects.addWords.length ? `新的密码词“${effects.addWords.join("、")}”在你的记录里落了下来。` : "";
    const relationText = encounterId && effects.relations[encounterId]
      ? `${ENTITIES[encounterId].short}对你的态度发生了细小但无法撤销的偏移。`
      : "";
    if (roleId === "fan") {
      return dedupeJoinedNarrative(`${clueText}${wordText}${relationText}你把这一切都先译成了更容易承受的语言：这是考验，也是提醒；是别人暴露的罪，也是你自己正在滋长的罪。尤其当你的选择带来一点伤口、一点眩晕或一点异样的平静时，你甚至会本能地怀疑，那是不是你最熟悉、也最危险的那种安慰。你一边想把结果理解成恩典，一边又知道恩典从来不会这么轻易落到人手里。也正因为知道，你才更难放过自己在这一刻究竟是出于慈悲、偏执，还是出于某种终于能证明自己仍被注视着的渴望。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`);
    }
    if (roleId === "ziche") {
      return dedupeJoinedNarrative(`${clueText}${wordText}${relationText}这些成果在你脑子里立刻变成了新的资源分布图：谁更可信、哪里更危险、哪台设备还值得抢救、哪一条路以后必须绕开。你并不在乎过程够不够体面，重要的是它确实让你比十五分钟之前多握住了一点主动权。哪怕这主动权只是多一把顺手的铁器、多一条晚点才会被别人发现的后路、或者多一个你已经确认一旦出事就会先坏事的人，也足够让你在下一次转角前把脚步放得更稳一点。你从不把这种稳当成宽慰，它更像一笔暂时还没被夺走的资本。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`);
    }
    if (roleId === "yamada") {
      return dedupeJoinedNarrative(`${clueText}${wordText}${relationText}你表面上还稳着，心里却已经把刚才的眼神、停顿和漏洞全部记下。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`);
    }
    if (roleId === "anjie") {
      return dedupeJoinedNarrative(`${clueText}${wordText}${relationText}你迅速把它们并进笔记里的假设链条，删掉一条，再补上两条。逻辑仍然没有完全闭合，可至少没有彻底断裂。只要还能继续校正、继续求证，你就还能说服自己：这场噩梦并非不可理解，它只是暂时还没有被拆到足够细。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`);
    }
    if (roleId === "debora") {
      return dedupeJoinedNarrative(`${clueText}${wordText}${relationText}你嘴上也许仍旧会说自己只是运气好、只是瞎碰到，可身体比谎言诚实得多。你知道哪些角落该避，哪些人已经开始把你重新归类，哪些线索一旦公开就再也收不回来。那份熟悉感让你厌恶，也让你在这种局里活得比别人顺手。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`);
    }
    return dedupeJoinedNarrative(`${clueText}${wordText}${relationText}你能感觉到这段结果不是单纯的“得到”或“失去”，更像某扇门在你心里又开了一条缝。缝里涌进来的除了真相，还有他人的痛、建筑的回声，以及那些原本不该由活人替亡者承担的重量。你拿走它们的时候，已经知道之后总要还。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "outcome", encounterId)}`);
  }

  function buildRippleParagraph(roleId, slotId, encounterId, effects, intent, draftState, module) {
    const rolePassage = buildRoleModulePassage(roleId, slotId, "ripple", module, draftState, encounterId);
    if (roleId === "anjie") return buildAnjieRippleParagraph(slotId, encounterId, effects, intent) + rolePassage + buildModuleStageLine(roleId, module, draftState, "ripple", encounterId);
    if (roleId === "patrick") return buildPatrickRippleParagraph(slotId, encounterId, effects, intent) + rolePassage;
    if (roleId === "yamada") return buildYamadaRippleParagraph(slotId, encounterId, effects, intent) + rolePassage;
    if (roleId === "debora") return buildDeboraRippleParagraph(slotId, encounterId, effects, intent) + rolePassage;
    if (roleId === "fan") return buildFanRippleParagraph(slotId, encounterId, effects, intent) + rolePassage;
    if (roleId === "ziche") return buildZicheRippleParagraph(slotId, encounterId, effects, intent) + rolePassage;
    const genericOverride = buildGenericRippleOverride(slotId, encounterId, effects, intent, module, draftState);
    if (genericOverride) return `${genericOverride}${rolePassage}`;
    const missed = intent.tags.includes("rest")
      ? "你停下来的这十五分钟里，别处先响起了金属拖拽声和谁压得很低的争执。等你再动身时，那场小小的先机已经不属于你。"
      : "";
    const danger = effects.stats.alertness > 6 || draftState.stats.alertness > 52
      ? "更糟的是，这次选择把你在别人眼里的轮廓也抬亮了。之后再想保持模糊，会比现在难得多。"
      : "";
    const bond = effects.flags.patrickBond
      ? "你与派翠克之间那条原本若有若无的线，被这一次动作真正系紧了。到了终局，它很可能会替你挡一次刀，也可能逼你直视一次背叛。"
      : effects.flags.emilyProtected
        ? "艾米莉的命运因此向你这边偏了一点。她以后是会跟着你跑，还是拖着你一起陷下去，都将从这里开始分岔。"
        : effects.flags.karlExposed
          ? "卡尔不会忘记这一笔。无论你是逼视、反驳还是质问，他之后都更可能把你放进“需要处理”的那一列。"
          : "";
    if (roleId === "fan") {
      return `${missed || "你没有办法把后果只解释成偶然。"}${danger} ${bond}你心里已经提前浮现出了下一轮要面对的名字，像提前写好的代祷名单。只是这一次，你也知道名单上的人很可能包括你自己。更糟的是，你开始明白代祷并不总能换来平安，它很多时候只是在替之后必然会到来的撕裂，提前准备一种比较不难看的说法。你当然还会继续祈祷，可你已经很难再像最开始那样，单纯相信祈祷本身足够让事情变轻。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "ripple", encounterId)}`;
    }
    if (roleId === "ziche") {
      return `${missed || "这一步没有白走，但也绝不免费。"}${danger} ${bond}你把刚才的得失在脑中重新计价，立刻得出一个结论：之后的每十五分钟都要更快、更狠，最好比别人先一步把门、证据和生路都抢到手。你几乎能预见接下来的局势会怎样报复一切犹豫，所以连回头确认都变成了一种成本。你不喜欢自己总是这么想，可你也知道，真正到终局时，能让人活下来的往往不是漂亮话，而是你现在这种已经开始显得过分冷的预判。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "ripple", encounterId)}`;
    }
    if (roleId === "yamada") {
      return `${missed || "你知道自己已经改动了一小截时间线。"}${danger} ${bond}之后再见，谁都不会还像刚才。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "ripple", encounterId)}`;
    }
    if (roleId === "anjie") {
      return `${missed || "你在心里给这次选择打上了“会在两到三段时序后回响”的标记。"}${danger} ${bond}你几乎能预见之后的某个投票、某句质询、某次追逐会因为这一刻被推向完全不同的方向。问题只剩一个：到时候你是否来得及承担它。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "ripple", encounterId)}`;
    }
    if (roleId === "debora") {
      return `${missed || "你比谁都清楚，小决定最容易在后面长成大事故。"}${danger} ${bond}接下来你得一边继续扮演那个没什么用的阿姨，一边防着这次行动留下的余波把你过去的反应方式整个拖回台前。你未必愿意，但你很清楚自己已经在往那个方向走。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "ripple", encounterId)}`;
    }
    return `${missed || "这段回响并不会立刻结束。"}${danger} ${bond}你已经隐约听见后面的门在动了。那不是单纯的脚步或风声，而是某条命运线因为你的触碰改了角度，正准备在更靠后的时段里，向你索取真正的代价。${rolePassage}${buildModuleStageLine(roleId, module, draftState, "ripple", encounterId)}`;
  }

  function buildQuote(roleId, encounterId, intent, slotId) {
    if (roleId === "anjie") return buildAnjieQuote(encounterId, slotId);
    if (roleId === "patrick") return buildPatrickQuote(encounterId, slotId);
    if (roleId === "yamada") return buildYamadaQuote(encounterId, slotId);
    const genericOverride = buildGenericQuoteOverride(roleId, encounterId, slotId);
    if (genericOverride) return genericOverride;
    const target = encounterId ? ENTITIES[encounterId].short : "对方";
    if (slotId === "4.4") return `系统广播：票纸落下之后，任何人都不能假装自己只是旁观者。`;
    if (slotId === "5.1") return roleId === "patrick" ? `你听见自己骨缝里的回音说：现在轮到你成为门。` : `警报：第五小时开始。请参与者自行承担终局后果。`;
    if (roleId === "fan") return `你轻声对${target}说：“我会记住这份罪，也会记住你为什么走到这里。”`;
    if (roleId === "ziche") return `你盯着${target}，只留下一句：“别挡路，也别让我替你收尸。”`;
    if (roleId === "anjie") return `你合上笔记本时对${target}说：“先别急着演，我还没把你的逻辑看完。”`;
    if (roleId === "debora") return `你笑得像在打圆场：“阿姨我可能不懂大道理，但这种局总归有人在撒谎吧。”`;
    return `你对${target}低声道：“灵魂发抖的时候，说出口的话往往比沉默诚实。”`;
  }

  function buildNextNotice(roleId, slotId, encounterId, effects, intent) {
    if (slotId === "2.3" && effects.generatorGain > 0) {
      return "走廊灯色稳了一点。那台发电机被拉回来了，说明逃生机关不再只是纸面规则。";
    }
    if (slotId === STORY_ANCHORS.secondGather) {
      return roleId === "patrick"
        ? "第二次聚集之后，谁都没法再装作彼此刚认识。"
        : "第二次聚集之后，所有人彼此之间都少了一层缓冲。再见面时，谁都不可能再装成刚认识。";
    }
    if (slotId === STORY_ANCHORS.meruruDeath) {
      return roleId === "patrick"
        ? "梅露露死后，后面的相遇只会更短，也更硬。"
        : "梅露露死后，任何一句“冷静一点”都像在案发现场贴纸花。接下来的相遇只会更短、更硬。";
    }
    if (slotId === STORY_ANCHORS.finalVote) {
      return `投票结果已经把队伍撕开。之后的每一步都要按“${state.flags.voteOutcome || effects.flags.voteOutcome || "尚未清算"}之后”来重写。`;
    }
    if (slotId === STORY_ANCHORS.patrickAwakening) {
      return roleId === "patrick"
        ? "你已经不可能回到完全的人类视角。之后的选择会更多地决定，你是否还愿意替门外的人留下余地。"
        : "派翠克觉醒之后，之前建立的信任和怨恨都会在追逐里变成最直接的目标排序。";
    }
    if (intent.tags.includes("rest")) {
      return roleId === "patrick"
        ? "你刚才停下来的那点时间里，别处已经先把话说完了。"
        : "你刚才停下来的时间里，别处有人先一步拿到了话语权。下一时段开始时，这份落后会很明显。";
    }
    if (effects.flags.patrickBond) {
      return roleId === "patrick"
        ? "你已经把某个人也牵进了自己的终局。"
        : "你与派翠克之间的那条线已经真正出现。之后她会更记得你，也更可能把你卷进她的终局。";
    }
    if (effects.flags.emilyProtected) {
      return "艾米莉开始把你当成可以追着跑的人。保护她会改变终局，也会改变你自己最后站在门前时的速度。";
    }
    if (effects.flags.karlExposed) {
      return "卡尔看你的目光已经不再像试探，而更像记恨。投票前的任何重逢，都可能因此变成真正的冲撞。";
    }
    return "这次行动留下的回响还没有散。下一时段开始时，你会更清楚谁因为你而靠近，谁又因为你而改了路线。";
  }

  function buildEffectChips(effects) {
    const chips = [];
    const pushStat = (label, value) => {
      if (!value) return;
      chips.push(`${label} ${value > 0 ? `+${value}` : value}`);
    };
    pushStat("HP", effects.stats.hp);
    pushStat("MP", effects.stats.mp);
    pushStat("SAN", effects.stats.san);
    pushStat("真相", effects.stats.truth);
    pushStat("暴露", effects.stats.exposure);
    pushStat("警戒", effects.stats.alertness);
    if (effects.generatorGain) chips.push(`发电机 +${effects.generatorGain}`);
    effects.addWords.forEach((word) => chips.push(`密码 ${word}`));
    effects.addClues.forEach((clue) => chips.push(`线索：${clue}`));
    Object.entries(effects.relations).forEach(([key, delta]) => {
      chips.push(`${ENTITIES[key].short}${delta > 0 ? `信任 +${delta}` : `信任 ${delta}`}`);
    });
    return chips;
  }

  function chooseOption(optionKey) {
    const slotId = currentSlotId();
    const scene = composeScene(slotId, optionKey);
    if (!scene || !Array.isArray(scene.paragraphs)) {
      state.scene = null;
      state.phase = "decision";
      state.notice = "本时段结果文本缺失，系统已阻止进入异常结果页。请重新选择本时段行动。";
      persist();
      render();
      return;
    }
    state.scene = scene;
    state.phase = "result";
    state.scenePage = 0;
    applyEffectsToState(state, scene.effects, scene);
    if (scene.effects.flags.voteOutcome) {
      state.flags.voteOutcome = scene.effects.flags.voteOutcome;
    }
    state.notice = scene.nextNotice;
    state.log.push({
      slotId,
      title: scene.summary,
      optionKey,
      text: scene.paragraphs.join("\n\n"),
    });
    state.route.push({
      slotId,
      optionKey,
      optionLabel: scene.cleanLabel,
      encounter: scene.encounter?.short || "",
      chips: scene.effectChips,
      summary: scene.summary,
    });
    state.autosave = true;
    persist();
    render();
  }

  function continueSlot() {
    const role = currentRole();
    if (state.phase === "result" && PAGED_ROUTE_IDS.has(role?.id) && state.scene && Array.isArray(state.scene.paragraphs)) {
      const pages = role.id === "patrick"
        ? getPatrickResultPages(state.scene)
        : role.id === "anjie"
          ? getAnjieResultPages(state.scene)
          : getPagedResultPages(state.scene, role.id);
      const currentPage = clamp(Number(state.scenePage || 0), 0, Math.max(0, pages.length - 1));
      if (pages.length > 1 && currentPage < pages.length - 1) {
        state.scenePage = currentPage + 1;
        persist();
        render();
        return;
      }
    }
    if (state.slotIndex >= SLOT_ORDER.length - 1) {
      finishRoute();
      return;
    }
    state.slotIndex += 1;
    state.phase = "decision";
    state.scene = null;
    state.scenePage = 0;
    state.overlay = null;
    persist();
    render();
  }

  function finishRoute() {
    state.finished = true;
    state.screen = "end";
    state.overlay = null;
    state.scenePage = 0;
    state.archive[state.selectedRole] = true;
    state.outcome = determineOutcome();
    persist();
    render();
  }

  function determineOutcome() {
    const role = currentRole();
    const lastOption = state.route[state.route.length - 1]?.optionLabel || "";
    const sacrifice = /断后|挡住|留下|拒绝踏出|成为噩梦|走向追来的怪物|同归于尽|受死/.test(lastOption);
    const escaped = state.flags.gateReady || state.generators.progress >= 4;
    const truthHigh = state.stats.truth >= 6;
    if (role.id === "patrick") {
      if (state.flags.patrickMercy && state.relations.anjie >= 14) {
        return { type: "sacrifice", title: "安息结局", text: role.endingNotes.sacrifice };
      }
      if (truthHigh) {
        return { type: "escape", title: "回响结局", text: role.endingNotes.escape };
      }
      return { type: "lost", title: "沉没结局", text: role.endingNotes.lost };
    }
    if (sacrifice) return { type: "sacrifice", title: "献身结局", text: role.endingNotes.sacrifice };
    if (escaped && state.stats.hp > 0 && state.stats.san > 0) {
      return { type: "escape", title: truthHigh ? "真相结局" : "逃脱结局", text: role.endingNotes.escape };
    }
    return { type: "lost", title: "噩梦结局", text: role.endingNotes.lost };
  }

  function relationshipTone(value) {
    if (value >= 26) return "亲近";
    if (value >= 10) return "缓和";
    if (value <= -20) return "敌视";
    if (value <= -8) return "戒备";
    return "观望";
  }

  function render() {
    try {
      app.innerHTML = `
        ${renderMain()}
        ${renderOverlay()}
      `;
    } catch (error) {
      console.error("[Shepherd] Render failed.", error);
      renderFatal(error, ["当前页面或旧版存档已触发渲染保护，已改为显示错误面板。"]);
    }
  }

  function renderMain() {
    if (state.screen === "title") return renderTitle();
    if (state.screen === "select") return renderSelect();
    if (state.screen === "archive") return renderArchive();
    if (state.screen === "end") return renderEnd();
    return renderGame();
  }

  function renderTitle() {
    const saved = loadState();
    const savedRole = saved?.selectedRole && ROLE_DEFS[saved.selectedRole] ? ROLE_DEFS[saved.selectedRole] : null;
    return `
      <section class="frame title-shell">
        <section class="hero-panel">
          <div class="hero-copy">
            <div class="eyebrow">Degree 2 Preview</div>
            <h1>牧羊人疗养院</h1>
            <p>日式 AVG + 文字 RPG 方向的网页互动冒险原型。当前版本已将 20 个时段开始前的分支入口切换为 degree2 结构，并保留回看日志、手动存档、角色档案、地图与状态面板。</p>
            <div class="hero-actions">
              <button class="btn primary" data-action="start">开始新线路</button>
              <button class="btn" data-action="resume" ${saved?.selectedRole ? "" : "disabled"}>继续上次进度</button>
              <button class="btn" data-action="archive">查看角色档案</button>
            </div>
          </div>
          <div class="hero-grid">
            <div class="hero-card">
              <strong>开发程度 2</strong>
              <span>每个时段 3 选项，选择会改动关系、线索、投票与终局。</span>
            </div>
            <div class="hero-card">
              <strong>固定锚点</strong>
              <span>1.2 首次集会，2.4 第二次聚集，3.3 梅露露之死，4.4 投票，5.1 觉醒。</span>
            </div>
            <div class="hero-card">
              <strong>系统保留</strong>
              <span>手动存档、日志回看、线路档案、地图切换、密码与发电机进度。</span>
            </div>
            <div class="hero-card">
              <strong>文本策略</strong>
              <span>第二人称、角色口吻过滤、同地点折返差异化、休息也会触发后果。</span>
            </div>
          </div>
        </section>
        <section class="title-side">
          <section class="panel">
            <h2>已知状态</h2>
            <div class="stats-block">
              <div class="stat-chip"><span>已解锁档案</span><strong>${unlockedCount()} / 6</strong></div>
              <div class="stat-chip"><span>最近保存</span><strong>${savedRole ? `${savedRole.name} · ${SLOT_ORDER[saved.slotIndex || 0]}` : "无"}</strong></div>
              <div class="stat-chip"><span>结构规模</span><strong>6 角色 / 20 时段 / 3 分歧</strong></div>
            </div>
          </section>
          <section class="panel">
            <h2>当前说明</h2>
            <div class="bullet-list">
              <div>当前原型优先验证 degree2 分支骨架是否可玩、可存档、可回看。</div>
              <div>派翠克线路的 2.4 分歧依据现有规则文档补写，已显式纳入系统。</div>
              <div>所有结局仍保持“牧羊人疗养院”的核心锚点，不会把真相改写成别的体系。</div>
            </div>
          </section>
        </section>
      </section>
    `;
  }

  function renderSelect() {
    const selected = ROLE_DEFS[state.selectedRole] || ROLE_DEFS.fan;
    return `
      <section class="frame page-shell">
        <div class="topbar">
          <div>
            <h1>选择视角</h1>
            <p>本版保留 6 名可操作角色，对应 6 条 PC 视角线路。身份与能力仍隐藏到通关后。</p>
          </div>
          <div class="title-tags">
            <span class="tag-pill">姓名 / 背景 / 性格</span>
            <span class="tag-pill">秘密摘要</span>
            <span class="tag-pill">第二人称代入</span>
          </div>
        </div>
        <div class="select-layout">
          <section class="panel">
            <h2>可操作角色</h2>
            <div class="card-grid">
              ${Object.values(ROLE_DEFS)
                .map(
                  (role) => `
                    <button class="role-card ${selected.id === role.id ? "active" : ""}" data-action="pick-role" data-role="${role.id}">
                      <div class="role-top">
                        <strong>${role.name}</strong>
                        <span>${role.startRoom}</span>
                      </div>
                      <div class="role-role">${role.publicRole}</div>
                      <p>${role.background}</p>
                      <div class="tag-row">${role.tags.map((tag) => `<span class="small-pill">${tag}</span>`).join("")}</div>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </section>
          <section class="panel detail-panel">
            <h2>${selected.name}</h2>
            <div class="detail-line"><strong>公开背景</strong><span>${selected.background}</span></div>
            <div class="detail-line"><strong>秘密摘要</strong><span>${selected.secretHint}</span></div>
            <div class="detail-line"><strong>角色基调</strong><span>${selected.soul}</span></div>
            <div class="detail-line"><strong>初始房间</strong><span>${selected.startRoom}</span></div>
            <div class="detail-line"><strong>路线说明</strong><span>${selected.dossier}</span></div>
            <div class="hero-actions">
              <button class="btn primary" data-action="begin-role" data-role="${selected.id}">进入该角色线路</button>
              <button class="btn" data-action="back-title">返回标题</button>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function renderArchive() {
    return `
      <section class="frame page-shell">
        <div class="topbar">
          <div>
            <h1>角色档案</h1>
            <p>通关后补完隐藏身份、能力与更深层的人物真相。</p>
          </div>
          <div class="title-tags">
            <span class="tag-pill">已解锁 ${unlockedCount()} / 6</span>
          </div>
        </div>
        <div class="archive-grid">
          ${Object.values(ROLE_DEFS)
            .map((role) => {
              const unlocked = !!state.archive[role.id];
              return `
                <article class="panel archive-card ${unlocked ? "" : "locked"}">
                  <h2>${role.name}</h2>
                  <div class="archive-meta">${role.publicRole} · ${role.startRoom}</div>
                  <p>${unlocked ? role.archive.truth : role.dossier}</p>
                  <div class="detail-line"><strong>公开背景</strong><span>${role.background}</span></div>
                  <div class="detail-line"><strong>秘密摘要</strong><span>${role.secretHint}</span></div>
                  <div class="detail-line"><strong>隐藏条目</strong><span>${unlocked ? `${role.archive.role} / ${role.archive.ability}` : "通关后解锁"}</span></div>
                </article>
              `;
            })
            .join("")}
        </div>
        <div class="footer-actions">
          <button class="btn primary" data-action="back-title">返回标题</button>
        </div>
      </section>
    `;
  }

  function renderGame() {
    const role = currentRole();
    const slotId = currentSlotId();
    const slot = currentSlotMeta();
    if (!role || !slotId || !slot) {
      return renderRecoveryPanel();
    }
    const options = getRoleOptions(role.id, slotId);
    const decision = state.phase === "decision";
    return `
      <section class="frame game-layout">
        <aside class="rail left-rail">
          <section class="panel rail-card">
            <div class="eyebrow">主视角</div>
            <h2>${role.name}</h2>
            <div class="role-role">${role.publicRole}</div>
            <p>${role.dossier}</p>
            <div class="tag-row">${role.tags.map((tag) => `<span class="small-pill">${tag}</span>`).join("")}</div>
          </section>
          <section class="panel rail-card">
            <div class="panel-headline">状态</div>
            <div class="meter-list">
              ${renderMeter("HP", state.stats.hp, state.maxStats.hp)}
              ${renderMeter("MP", state.stats.mp, state.maxStats.mp)}
              ${renderMeter("SAN", state.stats.san, 99)}
              ${renderMeter("真相", state.stats.truth, 9)}
            </div>
            <div class="stat-grid">
              <div class="stat-chip"><span>暴露度</span><strong>${state.stats.exposure}</strong></div>
              <div class="stat-chip"><span>警戒度</span><strong>${state.stats.alertness}</strong></div>
              <div class="stat-chip"><span>疲劳</span><strong>${state.stats.fatigue}</strong></div>
              <div class="stat-chip"><span>发电机</span><strong>${state.generators.progress} / 4</strong></div>
            </div>
          </section>
          <section class="panel rail-card">
            <div class="panel-headline">关系波动</div>
            <div class="relation-list">
              ${Object.keys(ENTITIES)
                .filter((key) => key !== role.id)
                .sort((a, b) => Math.abs(state.relations[b] || 0) - Math.abs(state.relations[a] || 0))
                .slice(0, 6)
                .map(
                  (key) => `
                    <div class="relation-item">
                      <strong>${ENTITIES[key].short}</strong>
                      <span>${relationshipTone(state.relations[key] || 0)} · ${state.relations[key] || 0}</span>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </section>
        </aside>
        <main class="story-column">
          <section class="panel scene-header">
            <div>
              <div class="eyebrow">${slot.arc}</div>
              <h1>${slotId} · ${slot.title}</h1>
              <p>${slot.prompt}</p>
            </div>
            <div class="title-tags">
              <span class="tag-pill">${slot.locationCode}</span>
              <span class="tag-pill">${decision ? "分歧选择" : "结果回放"}</span>
            </div>
          </section>
          <section class="panel scene-map">
            <img src="${slot.map}" alt="${slot.location}" />
            <div class="map-overlay">
              <div class="tag-row">
                <span class="tag-pill">${slot.location}</span>
                <span class="tag-pill">${slot.anchor}</span>
              </div>
              <p>${buildDecisionContext(role.id, slotId)}</p>
            </div>
          </section>
          ${
            decision
              ? `
                <section class="panel narrative-panel">
                  <div class="notice-box">
                    <strong>时段回响</strong>
                    <span>${state.notice || "线路刚开始，你还来不及知道自己的选择会在哪一处墙角回响。"} </span>
                  </div>
                  <div class="option-grid">
                    ${["A", "B", "C"]
                      .map((key) => renderOptionCard(role.id, slotId, key, options[key]))
                      .join("")}
                  </div>
                </section>
              `
              : renderSceneResult()
          }
        </main>
        <aside class="rail right-rail">
          <section class="panel rail-card">
            <div class="panel-headline">密码与线索</div>
            <div class="tag-row">${PASSWORD_WORDS.map((word) => `<span class="password-pill ${state.generators.words.includes(word) ? "on" : ""}">${word}</span>`).join("")}</div>
            <div class="clue-list">
              ${state.clues.length ? state.clues.slice(-8).map((clue) => `<div class="clue-item">${clue}</div>`).join("") : `<div class="clue-item muted">尚未整理出可靠线索</div>`}
            </div>
          </section>
          <section class="panel rail-card">
            <div class="panel-headline">系统功能</div>
            <div class="control-stack">
              <button class="btn" data-action="toggle-fast">${state.fast ? "关闭快进摘要" : "开启快进摘要"}</button>
              <button class="btn" data-action="open-log">回看日志</button>
              <button class="btn" data-action="open-save">手动存档</button>
              <button class="btn" data-action="toggle-sound">${state.sound ? "关闭按钮音" : "开启按钮音"}</button>
              <button class="btn" data-action="back-title">返回标题</button>
            </div>
          </section>
          <section class="panel rail-card">
            <div class="panel-headline">路线轨迹</div>
            <div class="timeline">
              ${SLOT_ORDER.map((id, index) => {
                const current = index === state.slotIndex;
                const passed = index < state.slotIndex || (!decision && index === state.slotIndex);
                return `<div class="timeline-item ${current ? "current" : ""} ${passed ? "passed" : ""}"><strong>${id}</strong><span>${SLOT_META[id].title}</span></div>`;
              }).join("")}
            </div>
          </section>
        </aside>
      </section>
    `;
  }

  function renderMeter(label, value, max) {
    const width = Math.round((value / max) * 100);
    return `
      <div class="meter-card">
        <div class="meter-head"><strong>${label}</strong><span>${value} / ${max}</span></div>
        <div class="meter-bar"><span style="width:${width}%"></span></div>
      </div>
    `;
  }

  function buildDecisionContext(roleId, slotId) {
    const slot = SLOT_META[slotId];
    const role = ROLE_DEFS[roleId];
    const prefix =
      roleId === "fan"
        ? "你本能地先想，这是否又是一场被包装成恩赐的试炼。"
        : roleId === "ziche"
          ? "你先看退路，再看人，最后才看故事。"
          : roleId === "yamada"
            ? "你先决定要把哪张表情挂在脸上，再决定要不要真的靠近。"
            : roleId === "anjie"
              ? "你在心里先列出假设，再决定该从哪条线开始验证。"
              : roleId === "debora"
                ? "你习惯先把自己放到最不显眼的位置，然后观察谁以为自己最安全。"
                : "你会先听哪扇门最冷、哪段走廊先回声，再决定要不要靠近。";
    return `${prefix} ${slot.prompt} ${state.notice || ""}`.trim();
  }

  function renderOptionCard(roleId, slotId, key, label) {
    const module = getOptionModule(roleId, slotId, key);
    const intent = analyzeChoice(label, key, slotId);
    const compactLabel = compactDecisionLabel(roleId, slotId, label);
    const compactRoute = COMPACT_RESULT_ROUTE_IDS.has(roleId);
    const chips = [];
    if (!compactRoute) {
      if (intent.tags.includes("rest")) chips.push("休息");
      if (intent.tags.includes("generator")) chips.push("发电机");
      if (intent.tags.includes("social")) chips.push("社交");
      if (intent.tags.includes("investigate")) chips.push("调查");
      if (intent.tags.includes("attack")) chips.push("高风险");
      if (intent.targets.length) chips.push(`接触 ${intent.targets.map((id) => ENTITIES[id].short).join(" / ")}`);
      if (intent.location?.name) chips.push(intent.location.name);
      if (module?.branchClass) chips.push(describeBranchClass(module.branchClass));
      if (module?.urgency) chips.push(`紧迫 ${module.urgency}/5`);
    }
    const proseLine = buildOptionFlavorLine(roleId, slotId, module, intent);
    const focusLabel = compactRoute || !module ? "" : formatFocusLabel(module.focus);
    return `
      <button class="option-card" data-action="choose-option" data-option="${key}">
        <div class="option-top">
          <strong>${key}</strong>
          <span>${compactRoute ? describeBranchClass(module?.branchClass) : `风险 ${intent.risk}`}</span>
        </div>
        <p>${compactLabel}</p>
        ${focusLabel ? `<div class="archive-meta">${focusLabel}</div>` : ""}
        ${proseLine ? `<div class="archive-meta">${proseLine}</div>` : ""}
        ${chips.length ? `<div class="tag-row">${chips.map((chip) => `<span class="small-pill">${chip}</span>`).join("")}</div>` : ""}
      </button>
    `;
  }

  function buildOptionFlavorLine(roleId, slotId, module, intent) {
    if (!module) return "";
    if (roleId === "yamada" || roleId === "fan" || roleId === "debora" || roleId === "ziche") return "";
    const motifs = new Set(module.motifs || []);
    if (motifs.has("rest")) {
      return ensureSecondPersonChoice(roleId === "fan"
        ? "停下来，让痛苦暂时拥有能被祈祷承受的名字"
        : roleId === "ziche"
          ? "停下来，用静止换一轮更清楚的动静判断"
          : roleId === "yamada"
            ? "停下来，确认面具、语气和破绽都还压得住"
            : roleId === "anjie"
              ? "停下来，让逻辑、时间线和怀疑重新排队"
              : roleId === "debora"
                ? "停下来，先把旧账、疲态和求生本能压回壳里"
                : "停下来，等回声、亡者或门后的东西先开口");
    }
    if (motifs.has("generator")) return ensureSecondPersonChoice("把电力、门闩、密码与逃生节奏重新抢回手里");
    if (motifs.has("weapon")) return ensureSecondPersonChoice("让器具、陷阱和处理手段先于情绪说话");
    if (motifs.has("vote")) return ensureSecondPersonChoice("提前把怀疑、立场与票向推到无法装糊涂的位置");
    if (motifs.has("corpse")) return ensureSecondPersonChoice("从死亡边上捞出可被追责、也会反咬人的痕迹");
    if (motifs.has("ritual")) return ensureSecondPersonChoice(roleId === "patrick" ? "顺着禁忌、亡者与回声往更深的真相下潜" : "翻开象征、隐喻与旧仪式背后那层更难听的解释");
    if (motifs.has("alliance")) return ensureSecondPersonChoice("把关系从试探、借力一步步推向站队与共担后果");
    if (motifs.has("escape")) return ensureSecondPersonChoice("先替最后的出口、断后点和取舍顺序摸清轮廓");
    if (motifs.has("sacrifice")) return ensureSecondPersonChoice("提前靠近那个代价最大、也最容易要命的答案");
    if (motifs.has("pressure")) return ensureSecondPersonChoice("把对话逼到不能再靠礼貌、沉默或借口含糊过去");
    if (motifs.has("care")) return ensureSecondPersonChoice("用靠近、安抚和试探去测信任到底能承多久");
    if (motifs.has("surveillance")) return ensureSecondPersonChoice("先看清谁在观察、谁在躲、谁在等别人先失手");
    if (intent.targets.length) return ensureSecondPersonChoice(`把这一步直接压到${intent.targets.map((id) => ENTITIES[id].short).join(" / ")}身上，看反应先裂哪一层`);
    return "";
  }

  function renderSceneResult() {
    const scene = state.scene;
    if (!scene || !Array.isArray(scene.paragraphs)) {
      return `
        <section class="panel narrative-panel">
          <div class="notice-box">
            <strong>结果页已回退</strong>
            <span>这个存档缺少本时段结果文本，系统已阻止白屏。你可以直接回到本时段开头重新选择。</span>
          </div>
          <div class="footer-actions">
            <button class="btn primary" data-action="recover-decision">返回本时段选择</button>
            <button class="btn" data-action="back-title">返回标题</button>
          </div>
        </section>
      `;
    }
    const isPatrick = state.selectedRole === "patrick";
    const isAnjie = state.selectedRole === "anjie";
    const routePaged = PAGED_ROUTE_IDS.has(state.selectedRole);
    const resultPages = isPatrick
      ? getPatrickResultPages(scene)
      : isAnjie
        ? getAnjieResultPages(scene)
        : routePaged
          ? getPagedResultPages(scene, state.selectedRole)
          : [state.fast ? scene.paragraphs.slice(0, 2) : scene.paragraphs];
    const pageIndex = clamp(Number(state.scenePage || 0), 0, Math.max(0, resultPages.length - 1));
    const shownParagraphs = resultPages[pageIndex] || [];
    const hasMorePages = routePaged && resultPages.length > 1 && pageIndex < resultPages.length - 1;
    const showQuote = !routePaged || !hasMorePages;
    return `
      <section class="panel narrative-panel">
        <div class="result-head">
          <div>
            <div class="eyebrow">本时段结果</div>
            <h2>${scene.slotId} · ${scene.cleanLabel}</h2>
            <p>${scene.location.name} · ${scene.encounter?.short || "无明确目标相遇"}</p>
          </div>
          <div class="tag-row">${scene.effectChips.slice(0, 6).map((chip) => `<span class="tag-pill">${chip}</span>`).join("")}</div>
        </div>
        <div class="story-text">
          ${shownParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          ${hasMorePages ? `<div class="notice-box result-pager"><strong>继续阅读</strong><span>本段尚未结束，按【继续】查看剩余内容。</span></div>` : ""}
          ${showQuote ? `<blockquote>${escapeHtml(scene.quote)}</blockquote>` : ""}
        </div>
        <div class="effect-wrap">
          ${scene.effectChips.map((chip) => `<span class="tag-pill">${chip}</span>`).join("")}
        </div>
        ${routePaged && resultPages.length > 1 ? `<div class="result-pager"><span>第 ${pageIndex + 1} / ${resultPages.length} 页</span><span>${hasMorePages ? "【继续】" : "已读完本段"}</span></div>` : ""}
        <div class="footer-actions">
          <button class="btn primary" data-action="continue-slot">${hasMorePages ? "【继续】" : state.slotIndex === SLOT_ORDER.length - 1 ? "结算结局" : "进入下一时段"}</button>
          <button class="btn" data-action="open-log">查看日志</button>
        </div>
      </section>
    `;
  }

  function renderEnd() {
    const role = currentRole();
    const outcome = state.outcome || determineOutcome();
    return `
      <section class="frame page-shell">
        <div class="topbar">
          <div>
            <h1>${outcome.title}</h1>
            <p>${role.name} 的 degree2 线路已完成。本次结局取决于发电机、关系、投票与终局阶段的处理方式。</p>
          </div>
          <div class="title-tags">
            <span class="tag-pill">${role.name}</span>
            <span class="tag-pill">${state.flags.voteOutcome || "未公开票型"}</span>
            <span class="tag-pill">发电机 ${state.generators.progress} / 4</span>
          </div>
        </div>
        <div class="ending-layout">
          <section class="panel ending-main">
            <h2>${role.name}</h2>
            <p>${outcome.text}</p>
            <div class="detail-line"><strong>终局摘要</strong><span>真相 ${state.stats.truth} / 暴露 ${state.stats.exposure} / 警戒 ${state.stats.alertness}</span></div>
            <div class="detail-line"><strong>投票结果</strong><span>${state.flags.voteOutcome ? `${ENTITIES[state.flags.voteOutcome === "self" ? role.id : state.flags.voteOutcome]?.name || "强制处决"}` : "未记录"}</span></div>
            <div class="detail-line"><strong>隐藏档案</strong><span>${role.archive.role} · ${role.archive.ability}</span></div>
          </section>
          <section class="panel">
            <h2>尾声补充</h2>
            <p>${role.archive.truth}</p>
            <div class="footer-actions">
              <button class="btn primary" data-action="archive">查看全部档案</button>
              <button class="btn" data-action="restart-role" data-role="${role.id}">重开该角色</button>
              <button class="btn" data-action="back-title">返回标题</button>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  function renderOverlay() {
    if (!state.overlay) return "";
    if (state.overlay === "log") return renderLogOverlay();
    if (state.overlay === "save") return renderSaveOverlay();
    return "";
  }

  function renderLogOverlay() {
    return `
      <section class="modal">
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <div class="eyebrow">回看日志</div>
              <h2>本轮记录 ${state.log.length} 条</h2>
            </div>
            <button class="btn" data-action="close-overlay">关闭</button>
          </div>
          <div class="modal-body">
            <div class="log-list">
              ${state.log.length
                ? state.log
                    .map(
                      (item, index) => `
                        <details class="log-entry" ${index === state.log.length - 1 ? "open" : ""}>
                          <summary>${item.title}</summary>
                          <p>${escapeHtml(item.text).replace(/\n/g, "<br />")}</p>
                        </details>
                      `,
                    )
                    .join("")
                : `<div class="log-entry"><summary>暂无记录</summary><p>还没有进入任何时段结果。</p></div>`}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderSaveOverlay() {
    const slots = loadSlots();
    return `
      <section class="modal">
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <div class="eyebrow">手动存档</div>
              <h2>3 个可用槽位</h2>
            </div>
            <button class="btn" data-action="close-overlay">关闭</button>
          </div>
          <div class="modal-body">
            <div class="save-grid">
              ${[1, 2, 3]
                .map((slot) => {
                  const entry = slots[slot];
                  const savedRole = entry?.selectedRole && ROLE_DEFS[entry.selectedRole] ? ROLE_DEFS[entry.selectedRole] : null;
                  const title = savedRole ? `${savedRole.name} · ${SLOT_ORDER[entry.slotIndex || 0]}` : "空槽";
                  return `
                    <section class="panel save-card">
                      <h3>槽位 ${slot}</h3>
                      <p>${title}</p>
                      <div class="archive-meta">${entry?.savedAt || "尚未保存"}</div>
                      <div class="footer-actions">
                        <button class="btn primary" data-action="save-slot" data-slot="${slot}">保存到此处</button>
                        <button class="btn" data-action="load-slot" data-slot="${slot}" ${entry ? "" : "disabled"}>读取</button>
                      </div>
                    </section>
                  `;
                })
                .join("")}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function saveSlot(slot) {
    const slots = loadSlots();
    slots[slot] = {
      ...state,
      savedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    };
    saveSlots(slots);
    state.overlay = "save";
    persist();
    render();
  }

  function loadSlot(slot) {
    const slots = loadSlots();
    if (!slots[slot]) return;
    state = normalizeState(slots[slot]);
    state.overlay = null;
    state.screen = state.selectedRole ? (state.finished ? "end" : "game") : "title";
    persist();
    render();
  }

  function recoverDecisionState() {
    state.phase = "decision";
    state.scene = null;
    state.scenePage = 0;
    state.overlay = null;
    state.notice = state.notice || "已回退到本时段开始前。";
    persist();
    render();
  }

  function renderRecoveryPanel() {
    return `
      <section class="frame page-shell fatal-shell">
        <section class="panel fatal-card">
          <div class="eyebrow">状态恢复</div>
          <h1>当前存档无法直接进入剧情页</h1>
          <p>系统已拦截本次渲染，避免显示空白页面。通常这意味着旧版存档缺少角色、时段或结果页数据。</p>
          <div class="bullet-list">
            <div>你可以返回标题重新进入角色线路。</div>
            <div>如果只是旧版结果页数据缺失，也可以尝试回退到本时段选择。</div>
          </div>
          <div class="footer-actions">
            <button class="btn primary" data-action="recover-decision">回到本时段选择</button>
            <button class="btn" data-action="back-title">返回标题</button>
          </div>
        </section>
      </section>
    `;
  }

  function renderFatal(error, notes = []) {
    const detail = [
      ...notes,
      error?.message ? `错误信息：${error.message}` : "",
    ]
      .filter(Boolean)
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");
    app.innerHTML = `
      <section class="frame page-shell fatal-shell">
        <section class="panel fatal-card">
          <div class="eyebrow">启动保护</div>
          <h1>页面已停止渲染，避免白屏</h1>
          <p>当前版本已经启用首屏保护。只要检测到故事数据缺失或旧存档状态异常，就会显示这个面板，而不是让界面静默崩溃。</p>
          <div class="bullet-list">${detail || "<div>没有更多可显示的错误细节。</div>"}</div>
          <div class="footer-actions">
            <button class="btn primary" data-action="back-title">返回标题</button>
          </div>
        </section>
      </section>
    `;
  }

  function toggleFast() {
    state.fast = !state.fast;
    persist();
    render();
  }

  function toggleSound() {
    state.sound = !state.sound;
    persist();
    render();
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function ensureAudio() {
    if (!state.sound) return null;
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function beep(freq = 660, duration = 0.05, type = "triangle", gainValue = 0.015) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }

  app.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (button.disabled) return;
    beep();
    switch (action) {
      case "start":
        startNew();
        break;
      case "resume":
        resumeLast();
        break;
      case "archive":
        state.screen = "archive";
        state.overlay = null;
        persist();
        render();
        break;
      case "back-title":
        resetToTitle();
        break;
      case "pick-role":
        state.selectedRole = button.dataset.role;
        state.screen = "select";
        persist();
        render();
        break;
      case "begin-role":
        beginRole(button.dataset.role);
        break;
      case "restart-role":
        beginRole(button.dataset.role);
        break;
      case "choose-option":
        chooseOption(button.dataset.option);
        break;
      case "continue-slot":
        continueSlot();
        break;
      case "open-log":
        state.overlay = "log";
        persist();
        render();
        break;
      case "open-save":
        state.overlay = "save";
        persist();
        render();
        break;
      case "close-overlay":
        state.overlay = null;
        persist();
        render();
        break;
      case "save-slot":
        saveSlot(button.dataset.slot);
        break;
      case "load-slot":
        loadSlot(button.dataset.slot);
        break;
      case "toggle-fast":
        toggleFast();
        break;
      case "toggle-sound":
        toggleSound();
        break;
      case "recover-decision":
        recoverDecisionState();
        break;
      default:
        break;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.overlay) {
        state.overlay = null;
        persist();
        render();
      } else {
        resetToTitle();
      }
    }
    if (state.screen === "game" && state.phase === "result" && (event.key === " " || event.key === "Enter")) {
      event.preventDefault();
      continueSlot();
    }
  });

  window.__shepherd = {
    getState: () => structuredClone(state),
    chooseOption,
    continueSlot,
    beginRole,
    toggleFast,
    loadSlot,
    saveSlot,
  };

  render();
})();
