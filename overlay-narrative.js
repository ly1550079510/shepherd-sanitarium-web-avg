(() => {
  const getEntities = () => window.SHEPHERD_STORY_DATA?.entities || {};
  const ENTITIES = getEntities();

  function describeVoteTargetLabel(voteTarget) {
    if (voteTarget === "karl") return "卡尔";
    if (voteTarget === "patrick") return "派翠克";
    if (voteTarget === "self") return "你自己";
    if (voteTarget === "crowd") return "所有人";
    return "那张尚未落下的票";
  }

  function buildAnjieAnchorOverlayLines(slotId, stage, draftState, encounterId) {
    if (!["2.4", "3.3", "4.4", "5.1", "5.4"].includes(slotId)) return [];
    const lines = [];
    const target = encounterId ? ENTITIES[encounterId]?.short || "对方" : "对方";
    const patrickTrust = draftState.relations.patrick || 0;
    const karlSuspicion = draftState.suspicion?.player?.karl || 0;
    const clueCount = draftState.clues.length;
    const meruruBlessing = !!draftState.flags.meruruBlessing;
    const voteTarget = describeVoteTargetLabel(draftState.keyChoices.vote_target);
    const finalChoice = draftState.keyChoices.final_choice || "escape";

    if (stage === "opening") {
      if (slotId === "2.4") {
        lines.push("你回到第二次聚集前，脑子里已经不再只是零散名词，而是一张被迫提前完工的推理草图。焚烧房的焦痕、发电机的节律、门锁的密码词和众人的站位被你一一压平，像证物那样排进同一行里；真正让你警惕的，反而是它们开始足以互相解释，足以逼你在公开与保留之间选边。");
        if (meruruBlessing) lines.push("偏偏梅露露留下的那一点温柔让这张草图始终无法彻底冷透。你明知道那不该算证据，却也无法假装那份临终前的靠近对你的判断毫无重量。");
        if (patrickTrust >= 14) lines.push("而当派翠克的名字也被写进这份排序里，你会不自觉地把笔尖停得更久。你厌恶这种停顿，因为它提醒你，自己已经不再只是旁观和拆解，而是在努力不让某个人被你亲手写得太快。");
      }
      if (slotId === "3.3") {
        lines.push("梅露露的死让时间线从可整理的异常，变成会反咬人的现场。你不再只想谁说谎、谁隐瞒，而是追问每次安抚、拖延和沉默，是否都已参与这场死亡。");
        if (karlSuspicion >= 20) lines.push("卡尔在这之后的每一次高声发言都会先撞上你的警报。你几乎能提前听见他准备怎样把暴烈重新包装成秩序，然后逼所有人顺着那条最粗暴的结论往下走。");
        if (meruruBlessing) lines.push("可越是如此，你越无法把梅露露简单归进死者这一栏。她像在死后还替某些人保留着模糊地带，而你必须一边尊重这种模糊，一边强迫自己继续往真相里挖。");
      }
      if (slotId === "4.4") {
        lines.push("投票前的空气最让你不适，因为它逼你把怀疑写成方向，把方向写成名字。纸面只会落下一枚名字，真正被写出去的却是你此前所有观察的优先级。");
        if (draftState.keyChoices.vote_target) lines.push(`你甚至已经能感觉到自己先前埋下的票向正在回头逼问你：既然你准备把矛头推向${voteTarget}，那你是否真的承受得起这份指向落地之后的后果。`);
        if (clueCount >= 4) lines.push("手里的记录越厚，这一刻反而越难轻松。因为线索已经不缺，真正缺的是那种可以让所有证据只导向唯一答案的宽恕。");
      }
      if (slotId === "5.1") {
        lines.push("派翠克觉醒的那一刻，你几乎能听见自己惯用的分类法在脑内一根根断开。当“人”和“容器”的边界真的在眼前撕裂时，你仍本能地想抓住一点还能继续命名和判别的东西。");
        if (patrickTrust >= 14) lines.push("最糟的是，你并不能把她单纯当成威胁处理。你越清楚她的危险，越清楚自己在此前那些接近与让步里到底投入了什么，于是判断本身也被迫带上了疼痛。");
      }
      if (slotId === "5.4") {
        lines.push("白门近在眼前之后，推理第一次不再天然指向真相，而是被逼着指向取舍。最后的问题已不是门能不能打开，而是门开以后谁能被带出去，谁会被留在门内。");
        if (finalChoice === "sacrifice") lines.push("如果你已经在心里接受了“必须有人留下”的结论，那么此刻每一道白光都更像一张签字页。你站在门前，几乎能感觉到自己正被要求亲手批准某种迟来的处决。");
        else lines.push("如果你还坚持尽可能把人带离这里，那么门前的每一步都会显得格外沉重。你必须不断说服自己，这并不是软弱，不是逃避，而是对仍能活着的人保留最低限度的偏袒。");
      }
    }

    if (stage === "encounter") {
      if (slotId === "2.4") {
        lines.push(`第二次聚集前后再和${target}说话时，你听见的几乎不只是对话，而是删节版证词。你会本能地去比对${target}此刻愿意公开交出的内容，和他在上一轮试探里藏起来的东西之间，到底差了多少。`);
        if (encounterId === "patrick" && patrickTrust >= 14) lines.push("可一旦对象是派翠克，你的审视里又会多出一层自我防备。你一边拆她的话，一边又近乎恼怒地意识到，自己居然在替她预留被误解的可能。");
      }
      if (slotId === "3.3") {
        lines.push(`从梅露露死去的那一刻开始，你再看${target}的表情时，就很难只把它当成普通反应。每一次呼吸变急、沉默变长和故作镇定，都会被你换算成“此人打算如何安放自己”。`);
        if (encounterId === "karl" && karlSuspicion >= 20) lines.push("尤其是卡尔。你越听他组织秩序，越觉得他像在抢先盖住某个会继续发热的伤口。");
      }
      if (slotId === "4.4") {
        lines.push(`投票时段里和${target}的每一句交锋，都像提前写好的口供草稿。你问出去的问题、让出去的沉默，都会在数分钟后被翻成“支持”“偏袒”或“指向”。`);
      }
      if (slotId === "5.1") {
        lines.push(`在派翠克异变之后再看${target}，你会发现所有人的反应都被迫退回本能。有人先后退，有人先解释，也有人急着找一个像答案的名字；而你必须更快判断，什么是恐惧，什么是假借恐惧的转移。`);
      }
      if (slotId === "5.4") {
        lines.push(`白门前的${target}已经很难再维持之前那种完整的人设。你和${target}之间此刻交换的也不再只是信息，而是谁愿意在最后关头把命短暂交到谁手里。`);
      }
    }

    if (stage === "outcome") {
      if (slotId === "2.4") {
        lines.push("第二次聚集之后，你第一次清晰感到自己的推理不再只是私人笔记，而是会改变人群温度的工具。你带回来的东西越像证据，别人就越会顺势开始审视你筛选证据的方法，而这让你的每一次正确都附带新的暴露。");
      }
      if (slotId === "3.3") {
        lines.push("死亡正式进入时间线之后，很多原本还能被称作误会的东西都失去了缓冲。你写下的每个判断后面，都像站着一个撤不回的结果，这让逻辑第一次显得更像共犯。");
      }
      if (slotId === "4.4") {
        lines.push("真正沉重的从来不是票被投出，而是你终于用行动承认自己愿意让哪一种怀疑先变成现实。推理一旦落成投票，就会要求你对被它击中的人负责。");
      }
      if (slotId === "5.1") {
        lines.push("派翠克的觉醒把你此前赖以支撑的判断秩序整片掀翻。你当然还能继续记录和分析，可你也不得不承认，有些真相在被命名之后并不会更可控。");
      }
      if (slotId === "5.4") {
        lines.push("门前阶段的收获几乎都带着反噬。你越清楚出口条件，越早要替后面的一切痛苦做取舍；而你最不愿承认的，是自己早就在用“谁能带出去”重新衡量每一个人。");
      }
    }

    if (stage === "ripple") {
      if (slotId === "2.4") {
        lines.push("从这一轮开始，你的逻辑已经不可能再只属于自己。别人会借用它、反驳它、误解它，也会沿着它继续把局势推向你未必愿意见到的方向；这意味着你往后每一次开口，都得顺带计算被人拿去当刀的可能。");
      }
      if (slotId === "3.3") {
        lines.push("梅露露之死留下的回响不会停在案发那一刻。它会继续黏在后续每一次争执上，让所有人都拿“如果当时再快一点会不会不同”来追咬自己。");
      }
      if (slotId === "4.4") {
        lines.push("投票之后最难摆脱的，不是结果，而是结果留下的阅读方式。人群会沿着你曾给出的方向重新解释你之后的一切动作，而你越想纠正，越像在补救。");
      }
      if (slotId === "5.1") {
        lines.push("派翠克撕开的不只是一个人的异变，更是你处理整场噩梦的方法。往后你很难再回到“只要继续收集证据，一切终能解释”的安全感里。");
      }
      if (slotId === "5.4") {
        lines.push("就算最后真的跨出白门，你也不会再只是那个安静记录别人失控的人。观察、判断与处决已经在你身上短暂并轨，之后都会留下痕。");
      }
    }

    return lines;
  }

  function buildPatrickAnchorOverlayLines(slotId, stage, draftState, encounterId) {
    if (!["2.4", "3.3", "4.4", "5.1", "5.4"].includes(slotId)) return [];
    const lines = [];
    const target = encounterId ? ENTITIES[encounterId]?.short || "对方" : "对方";
    const anjieTrust = draftState.relations.anjie || 0;
    const karlSuspicion = draftState.suspicion?.player?.karl || 0;
    const meruruBlessing = !!draftState.flags.meruruBlessing;
    const patrickMercy = !!draftState.flags.patrickMercy;
    const patrickAwakened = !!draftState.flags.patrickAwakened;
    const finalChoice = draftState.keyChoices.final_choice || "escape";

    if (stage === "opening") {
      if (slotId === "2.4") {
        lines.push("第二次聚集时，你先不听谁的结论，只听谁的呼吸乱了。有人抢着说，有人故意慢半拍。真正该记的，往往是那一秒停顿。");
        if (meruruBlessing) lines.push("梅露露留下的那点微光还在。它不能替你挡住恐惧，却提醒你别只顺着最响的声音走。");
        if (anjieTrust >= 14) lines.push("安洁站在灯下时，你会多看她一眼。她还在审视你，但也没有退开。");
      }
      if (slotId === "3.3") {
        lines.push("梅露露死后，这栋楼不再像建筑，更像还没封棺的现场。广播停了，尸体还在，连天色都像压低了一层。");
        if (karlSuspicion >= 20) lines.push("卡尔的火气也在这时变了味。你听得出，他快分不清追凶和泄愤。");
      }
      if (slotId === "4.4") {
        lines.push("投票室里最重的不是票纸，是每个人落笔前那一下停顿。名字一旦写下去，就会变成别人活命的理由。");
        if (anjieTrust >= 14) lines.push("你看向安洁时，会短暂地想：至少还有人知道你不是随手把谁推出去。");
      }
      if (slotId === "5.1") {
        lines.push("觉醒开始时，你先听见的不是尖叫，而是骨头里那阵回应。它等这具身体太久了，现在终于要往外顶。");
        if (patrickMercy) lines.push("可你还记得，有人曾经伸手拉过你一下。那点记忆没挡住异变，却让你没有立刻扑向所有人。");
      }
      if (slotId === "5.4") {
        lines.push("白门亮起来时，你想到的不是获救，而是终于有人要把里外分开。可门只会开，不会替谁洗掉一路上的血。");
        if (finalChoice === "sacrifice") lines.push("如果结局已经指向牺牲，你能先听见那阵安静。像仪式开始前，名字已经被写好。");
        else lines.push("如果结局还留着逃离的可能，你也知道带出去的只是活命，不是清洗。");
      }
    }

    if (stage === "encounter") {
      if (slotId === "2.4") {
        lines.push(`你和${target}说话时，先听的不是内容，而是气口。${target}现在给众人看的，到底是真脸，还是临时挑出来的安全版本。`);
      }
      if (slotId === "3.3") {
        lines.push(`梅露露倒下后，你再听${target}说话时，会多听一层。有人在解释，有人在躲死者留下的问题。你得分清哪边更像真话。`);
      }
      if (slotId === "4.4") {
        lines.push(`投票前和${target}碰面时，每句话都会往票纸上压分量。安抚是，质问也是，连沉默也是。`);
        if (encounterId === "anjie" && anjieTrust >= 14) lines.push("尤其面对安洁时，你很清楚，自己的靠近也可能把她一起拖下去。");
      }
      if (slotId === "5.1") {
        lines.push(`异变后再看${target}，你能更清楚地感觉到恐惧怎么撕开一个人。有人后退，有人先打，也有人拼命证明自己还算正常。`);
      }
      if (slotId === "5.4") {
        lines.push(`白门前的${target}已经不只是同行者。你会先想，下一步里是谁先碰到光，谁又会先被身后的黑暗记住。`);
      }
    }

    if (stage === "outcome") {
      if (slotId === "2.4") {
        lines.push("线索一摆上桌，恐惧也会跟着换形。有人开始依赖你，有人开始怀疑你，还有人只是想先找个能背锅的方向。");
      }
      if (slotId === "3.3") {
        lines.push("梅露露一死，很多原本模糊的回声都被钉实了。你知道这不是气氛变糟，而是死者终于把问题留在了明处。");
      }
      if (slotId === "4.4") {
        lines.push("投票落下时，你会更清楚地发现，人群要的未必是真相，只是一个能承接恐惧的名字。");
      }
      if (slotId === "5.1") {
        lines.push("觉醒后的收获和代价一起到来。你每多看清一点，就得拿更多人类的部分去垫。");
      }
      if (slotId === "5.4") {
        lines.push("到了最后，就算你替别人指出门和路，也不会因此自动得到宽恕。门外最多只是延续。");
      }
    }

    if (stage === "ripple") {
      if (slotId === "2.4") {
        lines.push("这次回响会拖很久。很多活人的发言，从这里开始也会像遗言一样被你记住。");
      }
      if (slotId === "3.3") {
        lines.push("死者不会因为广播停下就安静。梅露露留下的空位，之后还会逼所有人拿迟疑和借口去填。");
      }
      if (slotId === "4.4") {
        lines.push("投票之后，名字会有后劲。它不只决定现在谁站在火上，也会决定以后大家先记住谁的罪。");
      }
      if (slotId === "5.1") {
        lines.push("觉醒之后的每一步都会反过来问你：你现在靠近别人，是为了安息，还是为了喂饱更深的东西。");
        if (patrickAwakened) lines.push("更准确地说，你自己已经成了那个问题。");
      }
      if (slotId === "5.4") {
        lines.push("即使白门真的打开，跟着你出去的也不只有幸存。那些没安放好的回声，之后还会留在体内。");
      }
    }

    return lines;
  }

  function buildYamadaAnchorOverlayLines(slotId, stage, draftState, encounterId) {
    if (!["2.4", "3.3", "4.4", "5.1", "5.4"].includes(slotId)) return [];
    const lines = [];
    const target = encounterId ? ENTITIES[encounterId]?.short || "对方" : "对方";
    const emilyTrust = draftState.relations.emily || 0;
    const allianceCount = Object.keys(draftState.alliances || {}).length;
    const karlExposed = !!draftState.flags.karlExposed;
    const finalChoice = draftState.keyChoices.final_choice || "escape";

    if (stage === "opening") {
      if (slotId === "2.4") {
        lines.push("第二次聚集时，你不能只演无害。");
        if (allianceCount > 0) lines.push("有人把你当同路，你就得同时骗两边。");
      }
      if (slotId === "3.3") {
        lines.push("尸体真的出现后，面具会变重。");
        if (emilyTrust >= 12) lines.push("艾米莉在场时，你更怕她看见冷静。");
      }
      if (slotId === "4.4") {
        lines.push("投票时，你连沉默都会像立场。");
        if (karlExposed) lines.push("卡尔一失控，视线就会拽回你身上。");
      }
      if (slotId === "5.1") {
        lines.push("异变发生时，旧表演模板先失效。");
      }
      if (slotId === "5.4") {
        lines.push("到了白门前，说辞几乎都失灵了。");
        if (finalChoice === "sacrifice") lines.push("若有人必须留下，别让它像早有准备。");
      }
    }

    if (stage === "encounter") {
      if (slotId === "2.4") {
        lines.push(`第二次聚集时，你和${target}交换的是归类。`);
      }
      if (slotId === "3.3") {
        lines.push(`尸体出现后再面对${target}，你怕旧经验被看见。`);
      }
      if (slotId === "4.4") {
        lines.push(`投票前后，你得先稳住${target}。`);
        if (encounterId === "emily") lines.push("面对艾米莉时更难。");
      }
      if (slotId === "5.1") {
        lines.push(`异变后的${target}像照出你自己的镜子。`);
      }
      if (slotId === "5.4") {
        lines.push(`白门前的${target}已经不只是同伴或障碍。`);
      }
    }

    if (stage === "outcome") {
      if (slotId === "2.4") lines.push("变化是有人开始重新给你命名。");
      if (slotId === "3.3") lines.push("尸体进来后，你藏身的办法也得改。");
      if (slotId === "4.4") lines.push("投票压缩了你的中间地带。");
      if (slotId === "5.1") lines.push("异变后，你更清楚伪装是债。");
      if (slotId === "5.4") lines.push("越近白门，求生和表演越难分开。");
    }

    if (stage === "ripple") {
      if (slotId === "2.4") lines.push("从这一步开始，你的示弱更难被当真。");
      if (slotId === "3.3") {
        lines.push("尸体的回响会逼得你的面具越戴越紧。");
      }
      if (slotId === "4.4") {
        lines.push("投票后，你的沉默更容易被解释。");
      }
      if (slotId === "5.1") {
        lines.push("派翠克的异变也抬高了你后面每次表演的难度。");
      }
      if (slotId === "5.4") {
        lines.push("到门前，别人只在意你像站哪边。");
      }
    }

    return lines;
  }

  function buildDeboraAnchorOverlayLines(slotId, stage, draftState, encounterId) {
    if (!["2.4", "3.3", "4.4", "5.1", "5.4"].includes(slotId)) return [];
    const lines = [];
    const target = encounterId ? ENTITIES[encounterId]?.short || "对方" : "对方";
    const emilyTrust = draftState.relations.emily || 0;
    const karlExposed = !!draftState.flags.karlExposed;
    const truth = draftState.stats.truth || 0;
    const finalChoice = draftState.keyChoices.final_choice || "escape";

    if (stage === "opening") {
      if (slotId === "2.4") {
        lines.push("第二次聚集前，你最先担心的不是该说什么，而是哪些话一旦说得太准，就会让人意识到你并不像表面那样只是个会打圆场的年长女人。你得把真正有用的判断拆散、掺进玩笑和犹豫里，再一点点交出去，免得那份过于熟练先一步出卖你。");
      }
      if (slotId === "3.3") {
        lines.push("尸体真正出现时，最先醒来的不是情绪，而是职业化的视线。哪里该看，哪里不能碰，什么气味意味着拖延，什么沉默意味着现场曾被处理过，你几乎都在一瞬间想明白了；也正因为太明白，你才更要把这份熟练硬压回那层无害的大人外壳里。");
      }
      if (slotId === "4.4") {
        lines.push("投票室的秩序感会让你格外不舒服，因为它太像另一类现场整理。区别只在于，这一次被摆上桌面的不只是尸体和证据，还有每一个人早就不干净的动机。");
        if (karlExposed) lines.push("而卡尔一旦露出裂口，你就会本能地意识到另一种风险也在逼近。你比很多人都清楚，这类人最恨的往往不是被反对，而是被人完整记住自己失控时的样子。");
      }
      if (slotId === "5.1") {
        lines.push("异变发生时，你会比周围人更快地意识到自己那层“没什么用的大人”外壳正在整片剥落。生存反射、旧案记忆和那种曾经靠冷静活下来的身体经验会一起顶上来，逼你承认你并不只是会安慰两句的人。");
      }
      if (slotId === "5.4") {
        lines.push("到了白门前，你已经很难再轻松地把自己藏在玩笑和装糊涂后面。结局逼你回答的，是一个比这栋楼更早就存在的问题：你到底是想把自己活着带出去，还是想把那层“至少看起来像个好人”的样子也一起保住。");
        if (truth >= 4) lines.push("更糟的是，你手里已经握了太多足以拼回全貌的碎片。真相越完整，这个问题就越没法继续含糊过去。");
      }
    }

    if (stage === "encounter") {
      if (slotId === "2.4") {
        lines.push(`第二次聚集前后和${target}说话时，你得先让${target}愿意低估你。只有这样，后面那些真正要命的观察才有机会悄悄留下，而不会在你刚开口时就被对方反过来警觉地按住。`);
      }
      if (slotId === "3.3") {
        lines.push(`尸体旁边再面对${target}，你最小心的反而是自己的眼神。你知道“太会看现场的人”有多容易露馅，所以哪怕已经看明白了一半，也得先把那份明白咽回阿姨式的圆场和玩笑后面。`);
      }
      if (slotId === "4.4") {
        lines.push(`到了投票前后，你和${target}之间的很多话都不再只是试探，而是提前写给之后口供的草稿。你每多问一句，别人就越可能回头追问你为什么偏偏在这种时候问得这么准。`);
      }
      if (slotId === "5.1") {
        lines.push(`异变之后再看${target}，你会更敏锐地判断对方到底是在逃命、在装勇敢，还是已经开始借混乱为自己找退路。你太熟悉这种边缘时刻了，所以也更清楚自己现在说的每一句话，都可能把${target}推向活路，也可能把他推向更坏的判断。`);
      }
      if (slotId === "5.4") {
        lines.push(`白门前的${target}会让你格外强烈地意识到“谁该先走”不是道理题。你和${target}之间此刻交换的不是礼貌，不是情报，而是最后关头谁愿意替谁担一点脏、又愿意把多少脏留给自己。`);
      }
    }

    if (stage === "outcome") {
      if (slotId === "2.4") {
        lines.push("把判断带回人群之后，你最先得到的并不是轻松，而是新的风险。别人也许还说不清自己察觉到了什么，可那种“她怎么会这么熟”的疑心一旦种下，之后就很难再被完全挖掉。");
      }
      if (slotId === "3.3") {
        lines.push("尸体出现后的后果也格外直接。你比大多数人更清楚，一次处理不当的现场会在后来留下多少次回头补都补不上的后患，而这种清楚让你连呼吸都像背着旧案。");
      }
      if (slotId === "4.4") {
        lines.push("投票阶段最讨厌的地方在于，你已经不能只当那个帮人打圆场的大人了。哪怕嘴上仍旧轻巧，实际上你手里每一句话都可能在替某个人垫起或挖空最后的立足点。");
      }
      if (slotId === "5.1") {
        lines.push("异变把你身上那份“会处理残局的人”整个唤醒了。它并不让你骄傲，只会让你更累，因为你太清楚自己当初就是靠这种冷静活下来的，而这种活法从来都不干净。");
      }
      if (slotId === "5.4") {
        lines.push("越靠近白门，你越难继续把求生和赎罪分开。很多动作看上去像为了活下去，可你心里明白，其中有一部分不过是在偿还那些当年没来得及做、后来再也补不回来的决定。");
        if (emilyTrust >= 12) lines.push("艾米莉相关的结果尤其会压得你更沉。因为只要你真的替她伸过手，之后每一次想抽身，都会像在重复一次你最讨厌的见死不救。");
      }
    }

    if (stage === "ripple") {
      if (slotId === "2.4") {
        lines.push("从这一步之后，你那层“只是顺手说两句”的轻松会越来越难维持。因为人群一旦开始意识到你不是全然无用，就会在关键时刻本能地回头找你，而那种回头既是依赖，也是索债。");
      }
      if (slotId === "3.3") {
        lines.push("尸体留下的回响不会老实待在原地。你之后也许只是扶一下门、递一句话、或者再开个玩笑，脑子里却会突然跳回这一次谁被你看得太清、谁被你按得太晚。");
      }
      if (slotId === "4.4") {
        lines.push("投票前后留下的回音尤其烦人，因为它会粘在每一次后续接触上。别人之后再看你时，很可能不会先想到你的玩笑，而会先想到你曾在哪个时刻轻轻把天平推向过谁。");
      }
      if (slotId === "5.1") {
        lines.push("异变之后，你那层壳已经不可能完整复原。就算之后还能继续演，演出来的也只会是一个大家已经知道“必要时能做什么”的版本，而不是之前那个真能被低估的自己。");
      }
      if (slotId === "5.4") {
        lines.push("白门阶段的回声则更残酷一些。你会越来越清楚，自己不可能同时把所有人、所有真相和所有旧债都平整地带出去，总要有一部分被留在门这边继续发酵。");
        if (finalChoice === "sacrifice") lines.push("如果最后真的走向牺牲，你也会比谁都更难说服自己那只是必要选择。因为你太明白，所有“必要”背后都藏着谁先被放弃。");
      }
    }

    return lines;
  }


  window.SHEPHERD_OVERLAY_NARRATIVE = {
    describeVoteTargetLabel,
    buildAnjieAnchorOverlayLines,
    buildPatrickAnchorOverlayLines,
    buildYamadaAnchorOverlayLines,
    buildDeboraAnchorOverlayLines,
  };
})();
